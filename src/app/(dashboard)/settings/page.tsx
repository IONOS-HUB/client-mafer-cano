"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Printer, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { Receipt, ReceiptData } from "@/features/pos/components/receipt";

export default function SettingsPage() {
    const [isPrinting, setIsPrinting] = useState(false);
    const [testData, setTestData] = useState<ReceiptData | null>(null);



    const handlePrintTest = () => {
        setIsPrinting(true);
        const testData: ReceiptData = {
            invoiceNumber: "TEST-001",
            date: new Date().toLocaleString("es-EC"),
            items: [{
                description: "PRUEBA DE IMPRESIÓN",
                quantity: 1,
                unitPrice: 0.00,
                subtotal: 0.00
            }],
            subtotal: 0.00,
            total: 0.00,
            paymentMethod: "cash",
            businessInfo: {
                name: "SISTEMA POS",
                address: "Prueba de Configuración",
                phone: "---"
            }
        };
        setTestData(testData);

        // Small delay to allow state to update and render receipt
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 100);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Configuración</h1>

            {/* Configuración de Impresora */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-zinc-900 dark:text-white">
                            <Printer className="h-5 w-5 text-blue-500" />
                            Impresora Térmica
                        </h2>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                            La impresión se realiza directamente desde el navegador (CTRL + P).
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Navegador Listo
                        </span>
                    </div>
                </div>

                <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-medium text-zinc-900 dark:text-zinc-200">Prueba de Impresión</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                Envía un ticket de prueba para verificar el funcionamiento.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                onClick={handlePrintTest}
                                disabled={isPrinting}
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                {isPrinting ? "Imprimiendo..." : "Imprimir Prueba"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Receipt data={testData} />
        </div>
    );
}
