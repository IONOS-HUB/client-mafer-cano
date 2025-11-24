"use client";

import { useState } from "react";
import { SaleItem, PaymentMethod } from "../types";
import { Product, Service } from "@/features/products/types";
import { CustomerData } from "../invoice-types";
import { productService } from "@/features/products/service";
import { salesService } from "../service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScanDetection } from "@/features/products/hooks/use-scan-detection";
import { Trash2, ShoppingCart, DollarSign, Plus, PlayCircle, CheckCircle } from "lucide-react";
import { AddItemDialog } from "./add-item-dialog";
import { InvoiceDialog, PaymentDetails } from "./invoice-dialog";
import { Receipt, ReceiptData } from "./receipt";
import { useEffect } from "react";

export function POSTerminal() {
    const [saleStarted, setSaleStarted] = useState(false);
    const [items, setItems] = useState<SaleItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const [lastSale, setLastSale] = useState<ReceiptData | null>(null);

    useEffect(() => {
        if (lastSale) {
            // Imprimir dos veces con un delay entre cada impresión
            const timer1 = setTimeout(() => {
                window.print();

                // Segunda impresión después de 2 segundos
                const timer2 = setTimeout(() => {
                    window.print();
                }, 2000);

                return () => clearTimeout(timer2);
            }, 500);

            return () => clearTimeout(timer1);
        }
    }, [lastSale]);

    useScanDetection({
        onScan: async (code) => {
            if (saleStarted) {
                await handleAddProductByBarcode(code);
            }
        },
    });

    const handleStartSale = () => {
        setSaleStarted(true);
        setItems([]);
        toast.success("Venta iniciada - Escanea productos para agregar");
    };

    const handleAddProductByBarcode = async (barcode: string) => {
        try {
            const product = await productService.getProductByBarcode(barcode);
            if (!product) {
                toast.error(`Producto no encontrado: ${barcode}`);
                return;
            }

            if (product.stock <= 0) {
                toast.error(`Sin stock disponible: ${product.description}`);
                return;
            }

            const existingIndex = items.findIndex(
                (item) => item.type === "product" && item.product?.id === product.id
            );

            if (existingIndex >= 0) {
                const newItems = [...items];
                const newQuantity = newItems[existingIndex].quantity + 1;

                if (newQuantity > product.stock) {
                    toast.error(`Stock insuficiente. Disponible: ${product.stock}`);
                    return;
                }

                newItems[existingIndex].quantity = newQuantity;
                newItems[existingIndex].subtotal = newQuantity * product.price;
                setItems(newItems);
            } else {
                const newItem: SaleItem = {
                    id: crypto.randomUUID(),
                    type: "product",
                    product,
                    quantity: 1,
                    unitPrice: product.price,
                    subtotal: product.price,
                };
                setItems([...items, newItem]);
            }

            toast.success(`Agregado: ${product.description}`);
        } catch (error) {
            console.error(error);
            toast.error("Error al agregar producto");
        }
    };

    const handleAddProductFromDialog = (product: Product, quantity: number) => {
        const existingIndex = items.findIndex(
            (item) => item.type === "product" && item.product?.id === product.id
        );

        if (existingIndex >= 0) {
            const newItems = [...items];
            const newQuantity = newItems[existingIndex].quantity + quantity;

            if (newQuantity > product.stock) {
                toast.error(`Stock insuficiente. Disponible: ${product.stock}`);
                return;
            }

            newItems[existingIndex].quantity = newQuantity;
            newItems[existingIndex].subtotal = newQuantity * product.price;
            setItems(newItems);
        } else {
            const newItem: SaleItem = {
                id: crypto.randomUUID(),
                type: "product",
                product,
                quantity,
                unitPrice: product.price,
                subtotal: product.price * quantity,
            };
            setItems([...items, newItem]);
        }
    };

    const handleAddServiceFromDialog = (service: Service, price: number) => {
        const newItem: SaleItem = {
            id: crypto.randomUUID(),
            type: "service",
            service,
            quantity: 1,
            unitPrice: price,
            subtotal: price,
        };
        setItems([...items, newItem]);
    };

    const handleRemoveItem = (itemId: string) => {
        setItems(items.filter((item) => item.id !== itemId));
    };

    const handleQuantityChange = (itemId: string, newQuantity: number) => {
        const newItems = items.map((item) => {
            if (item.id === itemId) {
                const maxStock = item.product?.stock || 999;
                const validQuantity = Math.max(1, Math.min(newQuantity, maxStock));
                return {
                    ...item,
                    quantity: validQuantity,
                    subtotal: validQuantity * item.unitPrice,
                };
            }
            return item;
        });
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.subtotal, 0);
    };

    const handleFinishPurchase = () => {
        if (items.length === 0) {
            toast.error("Agrega productos para finalizar la compra");
            return;
        }
        setIsInvoiceDialogOpen(true);
    };

    const handleCompleteSale = async (customerData?: CustomerData, paymentDetails?: PaymentDetails) => {
        setIsProcessing(true);
        try {
            // Create sale with customer data
            console.log("Guardando venta...", {
                items,
                total: calculateTotal(),
                payment_method: paymentDetails?.method || "cash",
                customerData
            });

            const saleResult = await salesService.createSale(
                {
                    items,
                    total: calculateTotal(),
                    payment_method: paymentDetails?.method || "cash",
                },
                customerData
            );

            // Update stock for each product (the stock adjustments are already registered in the service)
            for (const item of items) {
                if (item.type === "product" && item.product) {
                    const newStock = item.product.stock - item.quantity;
                    await productService.updateStock(item.product.id, newStock);
                }
            }

            // Prepare receipt data with the invoice number from database
            const receiptData: ReceiptData = {
                invoiceNumber: saleResult.invoice_number || `${Date.now().toString().slice(-8)}`,
                date: new Intl.DateTimeFormat("es-EC", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                }).format(new Date()),
                customerData,
                items: items.map((item) => ({
                    description: item.product?.description || item.service?.description || "Item",
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.subtotal,
                })),
                subtotal: calculateTotal() / 1.15,
                total: calculateTotal(),
                paymentMethod: paymentDetails?.method || "cash",
                amountReceived: paymentDetails?.amountReceived,
                change: paymentDetails?.change,
                businessInfo: {
                    name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "MAFER CANO",
                    ruc: process.env.NEXT_PUBLIC_BUSINESS_RUC || "",
                    address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "",
                    phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "",
                },
            };

            setLastSale(receiptData);
            toast.success("Venta completada. Imprimiendo ticket...");

            setItems([]);
            setSaleStarted(false);
            setIsInvoiceDialogOpen(false);
        } catch (error) {
            console.error("Error completo:", error);
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            toast.error(`Error al procesar la venta: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancelSale = () => {
        if (items.length > 0) {
            if (confirm("¿Estás seguro de cancelar esta venta?")) {
                setItems([]);
                setSaleStarted(false);
                toast.info("Venta cancelada");
            }
        } else {
            setItems([]);
            setSaleStarted(false);
        }
    };

    const total = calculateTotal();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <ShoppingCart className="h-6 w-6" />
                            Carrito de Venta
                        </h2>
                        {saleStarted && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddDialogOpen(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Manual
                            </Button>
                        )}
                    </div>

                    {!saleStarted ? (
                        <div className="text-center py-20">
                            <PlayCircle className="h-24 w-24 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <h3 className="text-xl font-semibold mb-2">
                                No hay una venta activa
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                Presiona "Iniciar Venta" para comenzar
                            </p>
                            <Button size="lg" onClick={handleStartSale}>
                                <PlayCircle className="h-5 w-5 mr-2" />
                                Iniciar Venta
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                                <div className="text-green-700 dark:text-green-300 text-sm font-medium flex items-center gap-2">
                                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                    Venta activa - Escanea productos para agregar
                                </div>
                            </div>

                            <div className="space-y-2">
                                {items.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                        <p>No hay productos en el carrito</p>
                                        <p className="text-sm">
                                            Escanea un código de barras para comenzar
                                        </p>
                                    </div>
                                ) : (
                                    items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium">
                                                    {item.product?.description || item.service?.description}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    ${item.unitPrice.toFixed(2)} c/u
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max={item.product?.stock || 999}
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        handleQuantityChange(
                                                            item.id,
                                                            parseInt(e.target.value) || 1
                                                        )
                                                    }
                                                    className="w-20 text-center"
                                                />
                                                <span className="font-semibold w-24 text-right">
                                                    ${item.subtotal.toFixed(2)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6 sticky top-4">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Resumen de Pago
                    </h3>

                    <div className="space-y-4">
                        <div className="flex justify-between text-lg">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span className="font-semibold">${total.toFixed(2)}</span>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between text-2xl font-bold">
                                <span>Total:</span>
                                <span className="text-green-600">${total.toFixed(2)}</span>
                            </div>
                        </div>

                        {saleStarted && (
                            <>
                                <Button
                                    className="w-full h-14 text-lg"
                                    onClick={handleFinishPurchase}
                                    disabled={isProcessing || items.length === 0}
                                >
                                    <CheckCircle className="h-5 w-5 mr-2" />
                                    Finalizar Compra
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleCancelSale}
                                    disabled={isProcessing}
                                >
                                    Cancelar Venta
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <AddItemDialog
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                onAddProduct={handleAddProductFromDialog}
                onAddService={handleAddServiceFromDialog}
            />

            <InvoiceDialog
                isOpen={isInvoiceDialogOpen}
                onClose={() => setIsInvoiceDialogOpen(false)}
                onConfirmFinalConsumer={(paymentDetails) => handleCompleteSale(undefined, paymentDetails)}
                onConfirmWithData={(customerData, paymentDetails) => handleCompleteSale(customerData, paymentDetails)}
                total={total}
            />

            <Receipt data={lastSale} />
        </div>
    );
}
