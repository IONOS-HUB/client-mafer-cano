"use client";

import { SalesHistoryTable } from "@/features/pos/components/sales-history-table";

export default function SalesPage() {
    return (
        <div className="w-full -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-6 max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                    Historial de Ventas
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    Registro de todas las ventas realizadas (productos y servicios)
                </p>
            </div>

            <div className="w-full">
                <SalesHistoryTable />
            </div>
        </div>
    );
}
