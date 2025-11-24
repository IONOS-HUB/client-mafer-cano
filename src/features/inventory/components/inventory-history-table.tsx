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
import { ArrowUp, ArrowDown, Loader2, ChevronLeft, ChevronRight, Search, Filter, X, FileText } from "lucide-react";
import { salesService } from "@/features/pos/service";

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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalles de Factura</DialogTitle>
                        <DialogDescription>
                            Información completa de la venta
                        </DialogDescription>
                    </DialogHeader>
                    {isLoadingSale ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : saleDetails ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                <div>
                                    <p className="text-sm text-muted-foreground">Número de Factura</p>
                                    <p className="font-semibold">{saleDetails.invoice_number}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Fecha</p>
                                    <p className="font-semibold">{formatDate(saleDetails.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Método de Pago</p>
                                    <p className="font-semibold uppercase">
                                        {saleDetails.payment_method === 'cash' ? 'Efectivo' :
                                            saleDetails.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total</p>
                                    <p className="font-semibold text-lg">${saleDetails.total.toFixed(2)}</p>
                                </div>
                            </div>

                            {saleDetails.customer_data && (
                                <div className="p-4 bg-muted rounded-lg">
                                    <h4 className="font-semibold mb-2">Datos del Cliente</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Nombre:</span>
                                            <span className="ml-2">{saleDetails.customer_data.name}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">RUC/CI:</span>
                                            <span className="ml-2">{saleDetails.customer_data.identification}</span>
                                        </div>
                                        {saleDetails.customer_data.address && (
                                            <div className="col-span-2">
                                                <span className="text-muted-foreground">Dirección:</span>
                                                <span className="ml-2">{saleDetails.customer_data.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="font-semibold mb-2">Items</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="text-right">Cantidad</TableHead>
                                            <TableHead className="text-right">Precio Unit.</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {saleDetails.sale_items.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    {item.products?.description || item.services?.description || 'Item'}
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    ${(item.quantity * item.unit_price).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No se pudieron cargar los detalles</p>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
