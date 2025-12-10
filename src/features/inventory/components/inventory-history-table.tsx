"use client";

import { useEffect, useState } from "react";
import { inventoryService } from "../service";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUp, ArrowDown, Loader2, ChevronLeft, ChevronRight, Search, Filter, X, FileText, User, Printer } from "lucide-react";
import { salesService } from "@/features/pos/service";
import { Receipt, ReceiptData } from "@/features/pos/components/receipt";
import { toast } from "sonner";

interface AdjustmentWithProduct {
    id: string;
    product_id: string;
    adjustment_type: "add" | "subtract";
    quantity: number;
    reason: string;
    previous_stock: number;
    new_stock: number;
    created_at: string;
    sale_id?: string | null; // ID de la venta relacionada
    products: {
        barcode: string;
        description: string;
    };
}

interface SaleDetails {
    id: string;
    invoice_number: string;
    total: number;
    payment_method: string;
    customer_data: any;
    created_at: string;
    sale_items: Array<{
        quantity: number;
        unit_price: number;
        products?: { description: string };
        services?: { description: string };
    }>;
}

export function InventoryHistoryTable() {
    const [adjustments, setAdjustments] = useState<AdjustmentWithProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    // Filtros
    const [search, setSearch] = useState("");
    const [type, setType] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Estado para disparar la recarga cuando se filtra
    const [triggerFetch, setTriggerFetch] = useState(0);

    // Estado para el diálogo de detalles de factura
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [saleDetails, setSaleDetails] = useState<SaleDetails | null>(null);
    const [isLoadingSale, setIsLoadingSale] = useState(false);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

    useEffect(() => {
        loadAdjustments();
    }, [page, triggerFetch]);

    const loadAdjustments = async () => {
        setIsLoading(true);
        try {
            const filters = {
                search,
                type,
                startDate,
                endDate
            };
            const { data, count } = await inventoryService.getAdjustments(page, pageSize, filters);
            setAdjustments(data as AdjustmentWithProduct[]);
            if (count !== null) {
                setTotalCount(count);
                setTotalPages(Math.ceil(count / pageSize));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilter = () => {
        setPage(1);
        setTriggerFetch(prev => prev + 1);
    };

    const handleClear = () => {
        setSearch("");
        setType("all");
        setStartDate("");
        setEndDate("");
        setPage(1);
        setTriggerFetch(prev => prev + 1);
    };

    const handleViewSale = async (saleId: string) => {
        setSelectedSaleId(saleId);
        setIsLoadingSale(true);
        try {
            const sale = await salesService.getSaleById(saleId);
            // Obtener los items de la venta
            const { data: items } = await salesService.getSaleItems(saleId);
            setSaleDetails({
                ...sale,
                customer_data: sale.customer_data || null,
                sale_items: items || []
            } as SaleDetails);
        } catch (error) {
            console.error("Error loading sale details:", error);
        } finally {
            setIsLoadingSale(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    const formatDateForReceipt = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("es-EC", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    const handlePrint = () => {
        if (!saleDetails) return;

        const taxRate = 0.15;
        const subtotal = saleDetails.total / (1 + taxRate);

        const receipt: ReceiptData = {
            invoiceNumber: saleDetails.invoice_number,
            date: formatDateForReceipt(saleDetails.created_at),
            customerData: saleDetails.customer_data,
            items: saleDetails.sale_items.map((item) => ({
                description: item.products?.description || item.services?.description || 'Item',
                quantity: item.quantity,
                unitPrice: item.unit_price,
                subtotal: item.quantity * item.unit_price,
            })),
            subtotal: subtotal,
            total: saleDetails.total,
            paymentMethod: saleDetails.payment_method,
            businessInfo: {
                name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "MAFER CANO",
                ruc: process.env.NEXT_PUBLIC_BUSINESS_RUC || "1003573167001",
                address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "Av. Camilo Ponce y Av. Ricardo Sánchez",
                phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "0998007892",
            },
            isDuplicate: true, // Marcar como duplicado
        };

        setReceiptData(receipt);
        setTimeout(() => {
            window.print();
            toast.success("Imprimiendo factura duplicada...");
            // Limpiar después de imprimir para evitar que quede renderizado
            setTimeout(() => {
                setReceiptData(null);
            }, 500);
        }, 100);
    };

    return (
        <div className="space-y-4">
            {/* Barra de Filtros */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="w-full md:w-1/4">
                        <label className="text-xs font-medium mb-1 block text-muted-foreground">Producto</label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="w-full md:w-1/6">
                        <label className="text-xs font-medium mb-1 block text-muted-foreground">Tipo</label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="add">Entrada</SelectItem>
                                <SelectItem value="subtract">Salida</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-full md:w-1/6">
                        <label className="text-xs font-medium mb-1 block text-muted-foreground">Desde</label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="w-full md:w-1/6">
                        <label className="text-xs font-medium mb-1 block text-muted-foreground">Hasta</label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <div className="flex items-end gap-2 pb-0.5">
                        <Button onClick={handleFilter} className="gap-2">
                            <Filter className="h-4 w-4" />
                            Filtrar
                        </Button>
                        {(search || type !== "all" || startDate || endDate) && (
                            <Button variant="ghost" onClick={handleClear} size="icon" title="Limpiar filtros">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {isLoading && adjustments.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : adjustments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-white dark:bg-zinc-900 rounded-lg border">
                    <p>No se encontraron resultados con los filtros aplicados</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead className="text-center">Tipo</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead className="text-right">Stock Anterior</TableHead>
                                <TableHead className="text-right">Stock Nuevo</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {adjustments.map((adjustment) => (
                                <TableRow key={adjustment.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {formatDate(adjustment.created_at)}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {adjustment.products.description}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {adjustment.products.barcode}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {adjustment.adjustment_type === "add" ? (
                                            <Badge className="bg-green-500 hover:bg-green-600">
                                                <ArrowUp className="h-3 w-3 mr-1" />
                                                Entrada
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-red-500 hover:bg-red-600">
                                                <ArrowDown className="h-3 w-3 mr-1" />
                                                Salida
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {adjustment.adjustment_type === "add" ? "+" : "-"}
                                        {adjustment.quantity}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {adjustment.previous_stock}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {adjustment.new_stock}
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate" title={adjustment.reason}>
                                        {adjustment.reason}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {adjustment.sale_id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewSale(adjustment.sale_id!)}
                                                className="gap-2"
                                            >
                                                <FileText className="h-4 w-4" />
                                                Ver Factura
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Paginación */}
            {adjustments.length > 0 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-sm text-muted-foreground">
                        Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalCount)} de {totalCount} registros
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                        </Button>
                        <div className="text-sm font-medium">
                            Página {page} de {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || isLoading}
                        >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Diálogo de detalles de factura */}
            <Dialog open={selectedSaleId !== null} onOpenChange={(open) => !open && setSelectedSaleId(null)}>
                <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col p-6">
                    <DialogHeader className="pb-4 border-b flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-bold">Detalles de Factura</DialogTitle>
                                <DialogDescription className="text-base mt-1">
                                    Información completa de la venta
                                </DialogDescription>
                            </div>
                            {saleDetails && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrint}
                                    className="gap-2"
                                >
                                    <Printer className="h-4 w-4" />
                                    Imprimir Duplicado
                                </Button>
                            )}
                        </div>
                    </DialogHeader>
                    {isLoadingSale ? (
                        <div className="flex items-center justify-center py-12 flex-1">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : saleDetails ? (
                        <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-2">
                            {/* Información de la Factura */}
                            <div className="grid grid-cols-4 gap-2.5">
                                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50 shadow-sm">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                        <p className="text-[10px] font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Número</p>
                                    </div>
                                    <p className="text-xs font-bold text-blue-900 dark:text-blue-100 truncate">{saleDetails.invoice_number}</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50 shadow-sm">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <FileText className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                        <p className="text-[10px] font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">Fecha</p>
                                    </div>
                                    <p className="text-xs font-bold text-purple-900 dark:text-purple-100 leading-tight">{formatDate(saleDetails.created_at)}</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 shadow-sm">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <FileText className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                        <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Pago</p>
                                    </div>
                                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100 uppercase">
                                        {saleDetails.payment_method === 'cash' ? 'Efectivo' :
                                            saleDetails.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}
                                    </p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 rounded-lg border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <FileText className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">Total</p>
                                    </div>
                                    <p className="text-base font-bold text-amber-900 dark:text-amber-100">${saleDetails.total.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Datos del Cliente */}
                            {saleDetails.customer_data && (
                                <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200 dark:border-slate-700">
                                        <User className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Datos del Cliente</h4>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre</p>
                                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                {saleDetails.customer_data.name || saleDetails.customer_data.business_name || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">RUC/CI</p>
                                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                {saleDetails.customer_data.identification || 'N/A'}
                                            </p>
                                        </div>
                                        {saleDetails.customer_data.address && (
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Dirección</p>
                                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                    {saleDetails.customer_data.address}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Items Table */}
                            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                                <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                                    <FileText className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Items de la Venta</h4>
                                </div>
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 min-h-0 flex flex-col">
                                    <div className="overflow-auto flex-1">
                                        <Table>
                                            <TableHeader className="sticky top-0 z-10">
                                                <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                                    <TableHead className="font-semibold text-[10px] text-slate-700 dark:text-slate-300 py-2">Descripción</TableHead>
                                                    <TableHead className="text-right font-semibold text-[10px] text-slate-700 dark:text-slate-300 py-2">Cantidad</TableHead>
                                                    <TableHead className="text-right font-semibold text-[10px] text-slate-700 dark:text-slate-300 py-2">Precio Unit.</TableHead>
                                                    <TableHead className="text-right font-semibold text-[10px] text-slate-700 dark:text-slate-300 py-2">Subtotal</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {saleDetails.sale_items.map((item, index) => (
                                                    <TableRow key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                                        <TableCell className="font-medium text-xs text-slate-900 dark:text-slate-100 py-1.5">
                                                            {item.products?.description || item.services?.description || 'Item'}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-xs text-slate-700 dark:text-slate-300 py-1.5">
                                                            {item.quantity}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-xs text-slate-700 dark:text-slate-300 py-1.5">
                                                            ${item.unit_price.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-xs text-slate-900 dark:text-slate-100 py-1.5">
                                                            ${(item.quantity * item.unit_price).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 flex-shrink-0">
                                        <div className="flex justify-end gap-4 items-center">
                                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Total:</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">${saleDetails.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 flex-1">
                            <p className="text-muted-foreground">No se pudieron cargar los detalles</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Componente de Receipt para impresión */}
            <Receipt data={receiptData} printId="invoice-receipt-print" />
        </div>
    );
}
