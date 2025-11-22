import { supabase } from "@/lib/supabase";
import { StockAdjustment, StockAdjustmentInput } from "./types";

export const inventoryService = {
    async createAdjustment(adjustment: StockAdjustmentInput) {
        const { data, error } = await supabase
            .from("stock_adjustments")
            .insert(adjustment)
            .select()
            .single();
        if (error) throw error;
        return data as StockAdjustment;
    },

    async getAdjustments(page = 1, limit = 10, filters?: { startDate?: string; endDate?: string; type?: string; search?: string }) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from("stock_adjustments")
            .select(`
                *,
                products!inner (
                    barcode,
                    description
                )
            `, { count: 'exact' });

        if (filters?.type && filters.type !== "all") {
            query = query.eq("adjustment_type", filters.type);
        }

        if (filters?.startDate) {
            query = query.gte("created_at", `${filters.startDate}T00:00:00`);
        }

        if (filters?.endDate) {
            query = query.lte("created_at", `${filters.endDate}T23:59:59`);
        }

        if (filters?.search) {
            // Búsqueda por descripción de producto o código de barras
            // Nota: Supabase no soporta OR entre tablas relacionadas fácilmente en una sola línea sin RPC,
            // pero podemos filtrar por la descripción del producto ya que usamos !inner
            query = query.ilike("products.description", `%${filters.search}%`);
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) throw error;
        return { data, count };
    },

    async getAdjustmentsByProduct(productId: string) {
        const { data, error } = await supabase
            .from("stock_adjustments")
            .select("*")
            .eq("product_id", productId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data as StockAdjustment[];
    },
};
