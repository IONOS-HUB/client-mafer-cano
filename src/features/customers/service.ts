import { supabase } from "@/lib/supabase";
import { Customer, CreateCustomerInput, UpdateCustomerInput } from "./types";

export const customerService = {
    async getCustomerByIdentification(identification: string): Promise<Customer | null> {
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

    async updateCustomer(id: string, updates: UpdateCustomerInput): Promise<Customer> {
        const { data, error } = await supabase
            .from("customers")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
        
        if (error) throw error;
        return data as Customer;
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

    async createOrUpdateCustomer(customer: CreateCustomerInput): Promise<Customer> {
        try {
            // Primero intentar buscar el cliente por identificación
            const existing = await this.getCustomerByIdentification(customer.identification);
            
            if (existing) {
                // Si existe, actualizar
                console.log("Cliente existente encontrado, actualizando...", existing.id);
                return await this.updateCustomer(existing.id, customer);
            } else {
                // Si no existe, crear
                console.log("Cliente no encontrado, creando nuevo...");
                return await this.createCustomer(customer);
            }
        } catch (error) {
            console.error("Error en createOrUpdateCustomer:", error);
            throw error;
        }
    },
};

