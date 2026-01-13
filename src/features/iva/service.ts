import { supabaseBrowser as supabase } from "@/lib/supabase/client";

export interface IVASettings {
  id: string;
  value: number; // Value as decimal (0.15 = 15%, 0.08 = 8%)
  created_at: string;
  updated_at: string;
}

export const ivaService = {
  /**
   * Get the current IVA value
   * Returns the first record from tbl_iva (there should only be one)
   */
  async getIVAValue(): Promise<number> {
    const { data, error } = await supabase
      .from("tbl_iva")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching IVA value:", error);
      // Return default value if error
      return 0.15;
    }

    return data?.value ?? 0.15;
  },

  /**
   * Get the complete IVA settings
   */
  async getIVASettings(): Promise<IVASettings | null> {
    const { data, error } = await supabase
      .from("tbl_iva")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching IVA settings:", error);
      return null;
    }

    return data as IVASettings | null;
  },

  /**
   * Update the IVA value
   * @param value - New IVA value as decimal (0.15 = 15%, 0.08 = 8%)
   */
  async updateIVAValue(value: number): Promise<IVASettings> {
    // First, try to get existing record
    const { data: existing } = await supabase
      .from("tbl_iva")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from("tbl_iva")
        .update({ value })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating IVA value:", error);
        throw error;
      }

      return data as IVASettings;
    } else {
      // Create new record if none exists
      const { data, error } = await supabase
        .from("tbl_iva")
        .insert({ value })
        .select()
        .single();

      if (error) {
        console.error("Error creating IVA value:", error);
        throw error;
      }

      return data as IVASettings;
    }
  },
};
