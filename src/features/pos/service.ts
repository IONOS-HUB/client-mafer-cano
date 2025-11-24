import { supabase } from "@/lib/supabase";
import { Sale } from "./types";
import { CustomerData } from "./invoice-types";

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
            .select(`
                *,
                products (
                    description
                ),
                services (
                    description
                )
            `)
            .eq("sale_id", saleId);

        if (error) throw error;
        return { data, error: null };
    },
};
