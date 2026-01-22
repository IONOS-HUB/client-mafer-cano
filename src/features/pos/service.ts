import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { Sale } from "./types";
import { CustomerData } from "./invoice-types";
import { sriService } from "../sri/service";
import { getSRICompanyInfo, isSRIEnabled } from "../sri/config";
import { ivaService } from "../iva/service";
import { productService } from "../products/service";

export const salesService = {
  async createSale(
    sale: Omit<Sale, "id" | "created_at">,
    customerData?: CustomerData
  ) {
    // 0. Validate product stock before creating anything
    for (const item of sale.items) {
      if (item.type !== "product" || !item.product) continue;
      const { data: productData } = await supabase
        .from("products")
        .select("stock, description")
        .eq("id", item.product.id)
        .single();
      if (!productData) {
        throw new Error(`Producto no encontrado: ${item.product.description}`);
      }
      const newStock = productData.stock - item.quantity;
      if (newStock < 0) {
        throw new Error(
          `Stock insuficiente para "${productData.description}". Disponible: ${productData.stock}, solicitado: ${item.quantity}`
        );
      }
    }

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

          await productService.updateStock(item.product.id, newStock);

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

    if (stockAdjustments.length > 0) {
      const { error: adjustmentError } = await supabase
        .from("stock_adjustments")
        .insert(stockAdjustments);

      if (adjustmentError) {
        console.error("Error creating stock adjustments:", adjustmentError);
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

  async getSalesWithFilters(
    page = 1,
    limit = 10,
    filters?: {
      startDate?: string;
      endDate?: string;
      paymentMethod?: string;
      search?: string;
    }
  ) {
    // Si hay búsqueda, necesitamos obtener más datos para filtrar correctamente
    // ya que la búsqueda en campos JSONB null no funciona bien en Supabase
    const fetchLimit = filters?.search ? 1000 : limit; // Obtener más datos si hay búsqueda
    const from = filters?.search ? 0 : (page - 1) * limit;
    const to = filters?.search ? fetchLimit - 1 : from + limit - 1;

    let query = supabase
      .from("sales")
      .select("*", { count: "exact" });

    if (filters?.paymentMethod && filters.paymentMethod !== "all") {
      query = query.eq("payment_method", filters.paymentMethod);
    }

    if (filters?.startDate) {
      query = query.gte("created_at", `${filters.startDate}T00:00:00`);
    }

    if (filters?.endDate) {
      query = query.lte("created_at", `${filters.endDate}T23:59:59`);
    }

    // NO filtrar por búsqueda en la base de datos cuando hay búsqueda
    // Obtener todos los registros que coincidan con otros filtros y filtrar en el cliente
    // Esto es necesario porque necesitamos buscar en campos JSONB que pueden ser null

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching sales:", error);
      throw error;
    }

    // Si hay búsqueda, filtrar también en el cliente para campos JSONB
    // Esto es necesario porque Supabase no maneja bien nulls en campos JSONB con OR
    let filteredData = data || [];
    let filteredCount = count || 0;
    
    if (filters?.search && data) {
      const searchLower = filters.search.toLowerCase().trim();
      
      // Detectar si se está buscando consumidor final
      // Buscar cualquier parte de "consumidor final" o "cf"
      const finalConsumerKeywords = ["consumidor", "final", "cf", "consu", "fina"];
      const isSearchingForFinalConsumer = finalConsumerKeywords.some(keyword => 
        searchLower.includes(keyword) || keyword.includes(searchLower)
      );
      
      filteredData = data.filter((sale: Sale) => {
        // Verificar invoice_number
        const matchesInvoice = sale.invoice_number?.toLowerCase().includes(searchLower);
        
        // Filtrar por campos de customer_data (pueden ser null)
        const customerData = sale.customer_data;
        
        // Si no hay customer_data (consumidor final)
        if (!customerData) {
          // Incluir si coincide con invoice_number o si se busca consumidor final
          return matchesInvoice || isSearchingForFinalConsumer;
        }
        
        // Si hay customer_data, buscar en todos los campos
        const matchesName = customerData?.name?.toLowerCase().includes(searchLower);
        const matchesBusinessName = customerData?.business_name?.toLowerCase().includes(searchLower);
        const matchesIdentification = customerData?.identification?.toLowerCase().includes(searchLower);
        const matchesEmail = customerData?.email?.toLowerCase().includes(searchLower);
        const matchesPhone = customerData?.phone?.toLowerCase().includes(searchLower);
        
        return matchesInvoice || matchesName || matchesBusinessName || matchesIdentification || matchesEmail || matchesPhone;
      });
      
      // Si hay búsqueda y filtramos en el cliente, necesitamos obtener el count correcto
      // Obtenemos todos los datos que coinciden con los otros filtros y luego contamos los filtrados
      if (filters.search) {
        let countQuery = supabase.from("sales").select("*", { count: "exact" });
        
        if (filters.paymentMethod && filters.paymentMethod !== "all") {
          countQuery = countQuery.eq("payment_method", filters.paymentMethod);
        }
        if (filters.startDate) {
          countQuery = countQuery.gte("created_at", `${filters.startDate}T00:00:00`);
        }
        if (filters.endDate) {
          countQuery = countQuery.lte("created_at", `${filters.endDate}T23:59:59`);
        }
        
        const { data: allDataForCount } = await countQuery
          .order("created_at", { ascending: false })
          .limit(10000); // Límite razonable para contar
        
        if (allDataForCount) {
          const searchLower = filters.search.toLowerCase().trim();
          
          // Detectar si se está buscando consumidor final
          const finalConsumerKeywords = ["consumidor", "final", "cf", "consu", "fina"];
          const isSearchingForFinalConsumer = finalConsumerKeywords.some(keyword => 
            searchLower.includes(keyword) || keyword.includes(searchLower)
          );
          
          const filtered = allDataForCount.filter((sale: Sale) => {
            const matchesInvoice = sale.invoice_number?.toLowerCase().includes(searchLower);
            const customerData = sale.customer_data;
            
            // Si no hay customer_data (consumidor final)
            if (!customerData) {
              return matchesInvoice || isSearchingForFinalConsumer;
            }
            
            const matchesName = customerData?.name?.toLowerCase().includes(searchLower);
            const matchesBusinessName = customerData?.business_name?.toLowerCase().includes(searchLower);
            const matchesIdentification = customerData?.identification?.toLowerCase().includes(searchLower);
            const matchesEmail = customerData?.email?.toLowerCase().includes(searchLower);
            const matchesPhone = customerData?.phone?.toLowerCase().includes(searchLower);
            return matchesInvoice || matchesName || matchesBusinessName || matchesIdentification || matchesEmail || matchesPhone;
          });
          filteredCount = filtered.length;
        }
      }
      
      // Aplicar paginación después del filtrado
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      filteredData = filteredData.slice(startIndex, endIndex);
    }

    // Log para debugging
    console.log("Sales fetched:", {
      count: filteredCount,
      dataLength: filteredData?.length,
      page,
      limit,
      filters,
      sampleSale: filteredData?.[0] ? {
        id: filteredData[0].id,
        total: filteredData[0].total,
        invoice_number: (filteredData[0]).invoice_number,
        customer_name: (filteredData[0]).customer_data?.name,
        created_at: (filteredData[0]).created_at,
      } : null,
    });

    return { data: filteredData, count: filteredCount };
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
