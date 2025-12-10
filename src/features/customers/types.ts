export interface Customer {
    id: string;
    identification_type: "ruc" | "cedula" | "passport";
    identification: string;
    business_name?: string;
    name?: string;
    email: string;
    phone: string;
    address: string;
    created_at: string;
    updated_at: string;
}

export type CreateCustomerInput = Omit<Customer, "id" | "created_at" | "updated_at">;
export type UpdateCustomerInput = Partial<CreateCustomerInput>;

