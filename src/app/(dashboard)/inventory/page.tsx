"use client";

import { InventoryHistoryTable } from "@/features/inventory/components/inventory-history-table";

export default function InventoryPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                    Historial de Inventario
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    Registro de todos los ajustes de stock realizados
                </p>
            </div>

            <InventoryHistoryTable />
        </div>
    );
}
