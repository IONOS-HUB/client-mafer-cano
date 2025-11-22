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
    created_at: string;
}

export type PaymentMethod = "cash" | "card" | "transfer";
