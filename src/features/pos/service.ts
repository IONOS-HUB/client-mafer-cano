import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { Sale } from "./types";
import { CustomerData } from "./invoice-types";
import { sriService } from "../sri/service";
import { getSRICompanyInfo, isSRIEnabled } from "../sri/config";
import { ivaService } from "../iva/service";

export const salesService = {
  async createSale(
    sale: Omit<Sale, "id" | "created_at">,
    customerData?: CustomerData
  ) {
    // 1. Crear la venta (cabecera) - el trigger asignará automáticamente el invoice_number
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({
        total: sale.total,
        payment_method: sale.payment_method,
        customer_data: customerData || null,
      })
      .select()
      .single();

    if (saleError) {
      console.error("Error creating sale header:", saleError);
      throw saleError;
    }

    // 2. Crear los items de la venta
    const saleItems = sale.items.map((item) => ({
      sale_id: saleData.id,
      product_id: item.type === "product" ? item.product?.id : null,
      service_id: item.type === "service" ? item.service?.id : null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems)
      .select();

    if (itemsError) {
      console.error("Error creating sale items:", itemsError);
      // Rollback: borrar la venta si fallan los items
      await supabase.from("sales").delete().eq("id", saleData.id);
      throw itemsError;
    }

    // 3. Registrar ajustes de stock para productos (con referencia a la venta)
    const stockAdjustments = [];

    for (let i = 0; i < sale.items.length; i++) {
      const item = sale.items[i];
      const insertedItem = insertedItems[i];

      if (item.type === "product" && item.product) {
        // Obtener el stock actual del producto
        const { data: productData } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product.id)
          .single();

        if (productData) {
          const previousStock = productData.stock;
          const newStock = previousStock - item.quantity;

          stockAdjustments.push({
            product_id: item.product.id,
            adjustment_type: "subtract",
            quantity: item.quantity,
            reason: `Venta - Factura ${saleData.invoice_number || saleData.id}`,
            previous_stock: previousStock,
            new_stock: newStock,
            sale_id: saleData.id,
            sale_item_id: insertedItem.id,
          });
        }
      }
    }

    // Insertar los ajustes de stock si hay productos
    if (stockAdjustments.length > 0) {
      const { error: adjustmentError } = await supabase
        .from("stock_adjustments")
        .insert(stockAdjustments);

      if (adjustmentError) {
        console.error("Error creating stock adjustments:", adjustmentError);
        // No lanzamos error aquí para no bloquear la venta, pero lo registramos
      }
    }

    // 4. Enviar factura electrónica al SRI (si está habilitado)
    const isServer = typeof window === "undefined";
    const sriHabilitado = isSRIEnabled();

    console.log(
      `[${
        isServer ? "SERVER" : "CLIENT"
      }] Verificando si SRI está habilitado...`
    );

    if (isServer) {
      // LOG PARA EL CMD: Aquí sí podemos ver todo
      console.log("Variables de entorno SRI (Servidor):", {
        hasCertificate: !!(process.env.SRI_P12_PATH || process.env.SRI_P12_URL),
        hasPassword: !!process.env.SRI_P12_PASSWORD,
        hasRuc: !!process.env.NEXT_PUBLIC_SRI_RUC,
        hasRazonSocial: !!process.env.NEXT_PUBLIC_SRI_RAZON_SOCIAL,
      });
    } else {
      // LOG PARA EL NAVEGADOR: Solo mostramos lo que es público
      console.log("Variables SRI (Cliente):", {
        status: sriHabilitado ? "Habilitado" : "Deshabilitado",
        ruc: process.env.NEXT_PUBLIC_SRI_RUC || "No configurado",
        seguridad: "Las llaves privadas están protegidas en el servidor.",
      });
    }

    if (sriHabilitado) {
      console.log(
        "SRI habilitado - Iniciando proceso de facturación electrónica"
      );
      try {
        const companyInfo = getSRICompanyInfo();
        if (companyInfo) {
          // Get IVA value from database
          let ivaRate = 0.15; // Default value
          try {
            ivaRate = await ivaService.getIVAValue();
          } catch (error) {
            console.error("Error fetching IVA value, using default:", error);
          }

          const saleRecord = saleData as unknown as {
            id: string;
            total: number;
            payment_method: string;
            customer_data: unknown | null;
            invoice_number?: string | null;
            created_at?: string | null;
          };

          const completeSale: Sale = {
            ...(saleRecord as unknown as Sale),
            items: sale.items,
            invoice_number: saleRecord.invoice_number ?? saleRecord.id,
            created_at: saleRecord.created_at ?? new Date().toISOString(),
          };

          const invoiceData = sriService.generateInvoiceData(
            completeSale,
            companyInfo,
            customerData,
            ivaRate
          );

          const sriResult = await sriService.sendInvoiceToSRI(
            saleData.id,
            invoiceData
          );

          console.log("Resultado del SRI:", {
            success: sriResult.success,
            accessKey: sriResult.accessKey,
            authorizationNumber: sriResult.authorizationNumber,
            errorMessage: sriResult.errorMessage,
          });

          // Actualizar la venta con el resultado del SRI
          const updateData: {
            sri_status: string;
            sri_sent_at: string;
            sri_access_key?: string;
            sri_authorization_number?: string;
            sri_authorized_at?: string;
            sri_error_message?: string;
          } = {
            sri_status: sriResult.success ? "sent" : "error",
            sri_sent_at: new Date().toISOString(),
          };

          if (sriResult.accessKey) {
            updateData.sri_access_key = sriResult.accessKey;
          }

          if (sriResult.authorizationNumber) {
            updateData.sri_authorization_number = sriResult.authorizationNumber;
            updateData.sri_status = "authorized";
            updateData.sri_authorized_at = new Date().toISOString();
          }

          if (sriResult.errorMessage) {
            updateData.sri_error_message = sriResult.errorMessage;
          }

          // Actualizar la base de datos con el resultado del SRI
          const { error: updateError } = await supabase
            .from("sales")
            .update(updateData)
            .eq("id", saleData.id);

          if (updateError) {
            console.error(
              "Error al actualizar datos SRI en la base de datos:",
              updateError
            );
            console.error("Datos que se intentaron actualizar:", updateData);
          } else {
            console.log("Datos SRI actualizados correctamente:", {
              saleId: saleData.id,
              status: updateData.sri_status,
              accessKey: updateData.sri_access_key,
              authorizationNumber: updateData.sri_authorization_number,
            });
            
            // Actualizar saleData con los nuevos valores del SRI
            Object.assign(saleData, updateData);
          }

          if (!sriResult.success) {
            console.error(
              "Error al enviar factura al SRI:",
              sriResult.errorMessage
            );
            // No lanzamos error para no bloquear la venta
          }
        }
      } catch (error) {
        console.error("Error en proceso de facturación electrónica:", error);
        // Actualizar estado de error en la base de datos
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";

        const errorData = {
          sri_status: "error",
          sri_error_message: errorMessage,
          sri_sent_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from("sales")
          .update(errorData)
          .eq("id", saleData.id);

        if (updateError) {
          console.error(
            "Error al actualizar estado de error SRI:",
            updateError
          );
        }
        
        // Actualizar saleData con el estado de error
        Object.assign(saleData, errorData);
        // No lanzamos error para no bloquear la venta
      }
    } else {
      console.log(
        "SRI NO habilitado - La venta se guardó sin facturación electrónica"
      );
      console.log(
        "Para habilitar el SRI, configure las variables de entorno en .env.local"
      );
    }

    return { ...saleData, items: sale.items } as Sale;
  },

  async getSales(limit = 50) {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as Sale[];
  },

  async getSaleById(id: string) {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Sale;
  },

  async getSaleItems(saleId: string) {
    const { data, error } = await supabase
      .from("sale_items")
      .select(
        `
                *,
                products (
                    description
                ),
                services (
                    description
                )
            `
      )
      .eq("sale_id", saleId);

    if (error) throw error;
    return { data, error: null };
  },
};
