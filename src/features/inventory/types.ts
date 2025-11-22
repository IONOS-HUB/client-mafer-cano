export type AdjustmentType = "add" | "subtract";

export interface StockAdjustment {
    id: string;
    product_id: string;
    adjustment_type: AdjustmentType;
    quantity: number;
    reason: string;
    previous_stock: number;
    new_stock: number;
    created_at: string;
}

export interface StockAdjustmentInput {
    product_id: string;
    adjustment_type: AdjustmentType;
    quantity: number;
    reason: string;
    previous_stock: number;
    new_stock: number;
}
