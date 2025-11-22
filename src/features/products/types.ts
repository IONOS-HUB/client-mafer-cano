export interface Product {
    id: string;
    barcode: string;
    description: string;
    price: number;
    stock: number;
    created_at: string;
}

export interface Service {
    id: string;
    description: string;
    created_at: string;
}
