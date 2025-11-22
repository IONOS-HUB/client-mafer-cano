import { supabase } from "@/lib/supabase";
import { Sale } from "./types";
import { CustomerData } from "./invoice-types";

export const salesService = {
    async createSale(
        sale: Omit<Sale, "id" | "created_at">,
        customerData?: CustomerData
    ) {
        // 1. Crear la venta (cabecera)
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

        const { error: itemsError } = await supabase
            .from("sale_items")
            .insert(saleItems);

        if (itemsError) {
            console.error("Error creating sale items:", itemsError);
            // Opcional: Podríamos borrar la venta si fallan los items (rollback manual)
            await supabase.from("sales").delete().eq("id", saleData.id);
            throw itemsError;
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
};
