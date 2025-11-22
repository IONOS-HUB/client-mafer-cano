"use client";

import { POSTerminal } from "@/features/pos/components/pos-terminal";

export default function POSPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                    Punto de Venta
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    Escanea productos para agregar a la venta
                </p>
            </div>
            <POSTerminal />
        </div>
    );
}
