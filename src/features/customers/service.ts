import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { Customer, CreateCustomerInput, UpdateCustomerInput } from "./types";

export const customerService = {
  async getCustomerByIdentification(
    identification: string
  ): Promise<Customer | null> {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("identification", identification)
      .single();

    if (error) {
      // Si no se encuentra el cliente, retornar null en lugar de lanzar error
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data as Customer;
  },

  async createCustomer(customer: CreateCustomerInput): Promise<Customer> {
    const { data, error } = await supabase
      .from("customers")
      .insert(customer)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async updateCustomer(
    id: string,
    updates: UpdateCustomerInput
  ): Promise<Customer> {
    // Separate update from select to avoid PGRST116 when RLS prevents reading back
    const { error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    const { data, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    return (data ?? { id, ...updates }) as Customer;
  },

  async getCustomers(limit = 100) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Customer[];
  },

  async getCustomersWithFilters(
    page = 1,
    limit = 10,
    filters?: {
      search?: string;
      identificationType?: string;
    }
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("customers")
      .select("*", { count: "exact" });

    if (filters?.identificationType && filters.identificationType !== "all") {
      query = query.eq("identification_type", filters.identificationType);
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      query = query.or(
        `identification.ilike.${searchPattern},name.ilike.${searchPattern},business_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data, count };
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data as Customer;
  },

  async createOrUpdateCustomer(
    customer: CreateCustomerInput
  ): Promise<Customer> {
    // Primero intentar buscar el cliente por identificación
    const existing = await this.getCustomerByIdentification(
      customer.identification
    );

    if (existing) {
      // Si existe, actualizar
      console.log(
        "Cliente existente encontrado, actualizando...",
        existing.id
      );
      return await this.updateCustomer(existing.id, customer);
    } else {
      // Si no existe, crear
      console.log("Cliente no encontrado, creando nuevo...");
      return await this.createCustomer(customer);
    }
  },
};
