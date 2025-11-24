"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Printer, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { printerService } from "@/features/pos/printer-service";

export default function SettingsPage() {
    const [printerStatus, setPrinterStatus] = useState<"checking" | "connected" | "disconnected">("checking");
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        checkPrinter();
    }, []);

    const checkPrinter = async () => {
        setPrinterStatus("checking");
        const isOnline = await printerService.checkStatus();
        setPrinterStatus(isOnline ? "connected" : "disconnected");
    };

    const handlePrintTest = async () => {
        setIsPrinting(true);
        try {
            const result = await printerService.printTestPage();
            if (result.success) {
                toast.success("Página de prueba enviada");
            } else {
                toast.error("Error al imprimir: " + result.error);
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsPrinting(false);
        }
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
                            Estado de conexión con el servidor de impresión local.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {printerStatus === "checking" && (
                            <span className="flex items-center gap-1.5 text-zinc-500 text-sm bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Verificando...
                            </span>
                        )}
                        {printerStatus === "connected" && (
                            <span className="flex items-center gap-1.5 text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Conectada
                            </span>
                        )}
                        {printerStatus === "disconnected" && (
                            <span className="flex items-center gap-1.5 text-red-600 text-sm bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-full border border-red-200 dark:border-red-800">
                                <XCircle className="h-3.5 w-3.5" />
                                Desconectada
                            </span>
                        )}
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
                                variant="outline"
                                size="sm"
                                onClick={checkPrinter}
                                title="Verificar conexión nuevamente"
                            >
                                <RefreshCw className={`h-4 w-4 ${printerStatus === 'checking' ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handlePrintTest}
                                disabled={isPrinting || printerStatus !== "connected"}
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                {isPrinting ? "Imprimiendo..." : "Imprimir Prueba"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
