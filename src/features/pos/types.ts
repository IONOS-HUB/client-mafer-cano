import { Product, Service } from "../products/types";

export type SaleItemType = "product" | "service";

export interface SaleItem {
    id: string;
    type: SaleItemType;
    product?: Product;
    service?: Service;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface Sale {
    id: string;
    items: SaleItem[];
    total: number;
    payment_method: PaymentMethod;
    invoice_number?: string; // Número de factura generado automáticamente
    customer_data?: any; // Datos del cliente para facturación
    created_at: string;
    sri_access_key?: string;
    sri_authorization_number?: string;
    sri_status?: string;
    sri_error_message?: string;
    sri_sent_at?: string;
    sri_authorized_at?: string;
}

export type PaymentMethod = "cash" | "card" | "transfer";
