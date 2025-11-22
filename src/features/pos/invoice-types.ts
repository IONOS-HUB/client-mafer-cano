export type InvoiceType = "final_consumer" | "with_data";

export interface CustomerData {
    identification_type: "ruc" | "cedula" | "passport";
    identification: string;
    business_name?: string; // Razón social (para RUC)
    name?: string; // Nombre (para cédula/pasaporte)
    email: string;
    phone: string;
    address: string;
}

export interface Invoice {
    id: string;
    sale_id: string;
    invoice_type: InvoiceType;
    customer_data?: CustomerData;
    created_at: string;
}
