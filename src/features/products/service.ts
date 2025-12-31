import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { Product, Service } from "./types";

export const productService = {
  async getProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("description");
    if (error) throw error;
    return data as Product[];
  },

  async getProductByBarcode(barcode: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("barcode", barcode)
      .single();
    if (error) return null;
    return data as Product;
  },

  async createProduct(product: Omit<Product, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("products")
      .insert(product)
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  },

  async updateStock(id: string, amount: number) {
    // Note: This is a simple update. For high concurrency, consider an RPC function.
    // But for this app, fetching current stock and updating is acceptable or using a simple increment if we had an RPC.
    // We will just set the new stock value for now, assuming the UI calculates it,
    // OR we can fetch-then-update.
    // Better approach for "adjusting": The UI sends the NEW total stock, or we create a specific function.
    // Let's assume the UI sends the NEW stock level for adjustments.
    const { data, error } = await supabase
      .from("products")
      .update({ stock: amount })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  },

  async updateProduct(
    id: string,
    updates: Partial<Omit<Product, "id" | "created_at">>
  ) {
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  },

  async deleteProduct(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  },
};

export const serviceService = {
  async getServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("description");
    if (error) throw error;
    return data as Service[];
  },

  async createService(service: Omit<Service, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("services")
      .insert(service)
      .select()
      .single();
    if (error) throw error;
    return data as Service;
  },

  async updateService(
    id: string,
    updates: Partial<Omit<Service, "id" | "created_at">>
  ) {
    const { data, error } = await supabase
      .from("services")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Service;
  },

  async deleteService(id: string) {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) throw error;
  },
};
