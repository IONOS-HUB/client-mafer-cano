"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, CheckCircle2, BookOpen, Percent, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Receipt, ReceiptData } from "@/features/pos/components/receipt";
import { ivaService } from "@/features/iva/service";
import { toast } from "sonner";
import Link from "next/link";

export default function SettingsPage() {
    const [isPrinting, setIsPrinting] = useState(false);
    const [testData, setTestData] = useState<ReceiptData | null>(null);
    const [ivaValue, setIvaValue] = useState<number>(15);
    const [ivaInput, setIvaInput] = useState<string>("15");
    const [isLoadingIVA, setIsLoadingIVA] = useState(true);
    const [isSavingIVA, setIsSavingIVA] = useState(false);

    useEffect(() => {
        loadIVAValue();
    }, []);

    const loadIVAValue = async () => {
        setIsLoadingIVA(true);
        try {
            const value = await ivaService.getIVAValue();
            const percentage = Math.round(value * 100);
            setIvaValue(value);
            setIvaInput(percentage.toString());
        } catch (error) {
            console.error("Error loading IVA value:", error);
            toast.error("Error al cargar el valor de IVA");
        } finally {
            setIsLoadingIVA(false);
        }
    };

    const handleSaveIVA = async () => {
        const percentage = parseFloat(ivaInput);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            toast.error("Por favor ingrese un valor válido entre 0 y 100");
            return;
        }

        setIsSavingIVA(true);
        try {
            const decimalValue = percentage / 100;
            await ivaService.updateIVAValue(decimalValue);
            setIvaValue(decimalValue);
            toast.success(`IVA actualizado a ${percentage}%`);
        } catch (error) {
            console.error("Error saving IVA value:", error);
            toast.error("Error al guardar el valor de IVA");
        } finally {
            setIsSavingIVA(false);
        }
    };

    const handlePrintTest = () => {
        setIsPrinting(true);
        // Calculate test amounts with current IVA
        const testTotal = 100.00; // Example total
        const testSubtotal = testTotal / (1 + ivaValue);
        const testIVA = testTotal - testSubtotal;
        
        const testData: ReceiptData = {
            invoiceNumber: "TEST-001",
            date: new Intl.DateTimeFormat("es-EC", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date()),
            items: [{
                description: "PRUEBA DE IMPRESIÓN",
                quantity: 1,
                unitPrice: testTotal,
                subtotal: testTotal
            }],
            subtotal: testSubtotal,
            iva: testIVA,
            ivaRate: ivaValue,
            total: testTotal,
            paymentMethod: "cash",
            businessInfo: {
                name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "MAFER CANO",
                ruc: process.env.NEXT_PUBLIC_BUSINESS_RUC || "1003573167001",
                address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "Av. Camilo Ponce y Av. Ricardo Sánchez",
                phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "0998007892",
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
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Configuración</h1>
                <Link href="/tutorial">
                    <Button variant="outline" className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        Ver Tutorial
                    </Button>
                </Link>
            </div>

            {/* Configuración de IVA */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-zinc-900 dark:text-white">
                            <Percent className="h-5 w-5 text-blue-500" />
                            Configuración de IVA
                        </h2>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                            Establece el porcentaje de IVA que se aplicará en todas las ventas.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="iva-value" className="text-zinc-900 dark:text-white">
                                Valor de IVA (%)
                            </Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    id="iva-value"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={ivaInput}
                                    onChange={(e) => setIvaInput(e.target.value)}
                                    disabled={isLoadingIVA || isSavingIVA}
                                    className="max-w-[200px]"
                                    placeholder="15"
                                />
                                <span className="text-zinc-600 dark:text-zinc-400">%</span>
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Valor actual: <span className="font-semibold">{Math.round(ivaValue * 100)}%</span>
                            </p>
                        </div>

                        <Button
                            onClick={handleSaveIVA}
                            disabled={isLoadingIVA || isSavingIVA || parseFloat(ivaInput) === Math.round(ivaValue * 100)}
                            className="gap-2"
                        >
                            {isSavingIVA ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

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

            <Receipt data={testData} printId="test-receipt-print" />
        </div>
    );
}
