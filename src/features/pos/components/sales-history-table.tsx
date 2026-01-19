"use client";

import { useEffect, useState, useCallback } from "react";
import { salesService } from "../service";
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
import { Loader2, ChevronLeft, ChevronRight, Search, Filter, X, FileText, User, Printer, Calendar, CreditCard, DollarSign, Receipt } from "lucide-react";
import { Receipt as ReceiptComponent, ReceiptData } from "./receipt";
import { CustomerData } from "../invoice-types";
import { toast } from "sonner";

interface SaleWithDetails {
    id: string;
    invoice_number: string;
    total: number;
    payment_method: string;
    customer_data?: {
        name?: string;
        business_name?: string;
        identification?: string;
        address?: string;
        identification_type?: string;
        email?: string;
        phone?: string;
    } | null;
    created_at: string;
    sri_access_key?: string;
    sri_authorization_number?: string;
    sri_status?: string;
}

interface SaleDetails {
    id: string;
    invoice_number: string;
    total: number;
    payment_method: string;
    customer_data?: {
        name?: string;
        business_name?: string;
        identification?: string;
        address?: string;
        identification_type?: string;
        email?: string;
        phone?: string;
    } | null;
    created_at: string;
    sale_items: Array<{
        quantity: number;
        unit_price: number;
        products?: { description: string };
        services?: { description: string };
    }>;
    sri_access_key?: string;
    sri_authorization_number?: string;
    sri_status?: string;
    sri_error_message?: string;
    sri_sent_at?: string;
    sri_authorized_at?: string;
}

export function SalesHistoryTable() {
    const [sales, setSales] = useState<SaleWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    // Filtros
    const [search, setSearch] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Estado para el diálogo de detalles de factura
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [saleDetails, setSaleDetails] = useState<SaleDetails | null>(null);
    const [isLoadingSale, setIsLoadingSale] = useState(false);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

    // Debounce para búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Función para cargar ventas
    const loadSales = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters = {
                search: debouncedSearch,
                paymentMethod,
                startDate,
                endDate
            };
            const { data, count } = await salesService.getSalesWithFilters(page, pageSize, filters);
            
            // Log para debugging
            console.log("Sales loaded in component:", {
                count,
                dataLength: data?.length,
                page,
                pageSize,
                filters,
                sales: data?.map((s: SaleWithDetails) => ({
                    id: s.id,
                    total: s.total,
                    invoice_number: s.invoice_number,
                    payment_method: s.payment_method,
                })),
            });
            
            setSales(data as SaleWithDetails[]);
            if (count !== null) {
                setTotalCount(count);
                setTotalPages(Math.ceil(count / pageSize));
            }
        } catch (error) {
            console.error("Error loading sales:", error);
            toast.error("Error al cargar el historial de ventas");
        } finally {
            setIsLoading(false);
        }
    }, [page, debouncedSearch, paymentMethod, startDate, endDate]);

    // Cargar ventas cuando cambien los filtros o la página
    useEffect(() => {
        loadSales();
    }, [loadSales]);

    const handlePaymentMethodChange = (value: string) => {
        setPaymentMethod(value);
        setPage(1);
    };

    const handleStartDateChange = (value: string) => {
        setStartDate(value);
        setPage(1);
    };

    const handleEndDateChange = (value: string) => {
        setEndDate(value);
        setPage(1);
    };

    const handleClearFilter = (filterType: "search" | "paymentMethod" | "startDate" | "endDate") => {
        switch (filterType) {
            case "search":
                setSearch("");
                break;
            case "paymentMethod":
                setPaymentMethod("all");
                break;
            case "startDate":
                setStartDate("");
                break;
            case "endDate":
                setEndDate("");
                break;
        }
        setPage(1);
    };

    const handleClearAll = () => {
        setSearch("");
        setPaymentMethod("all");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    const hasActiveFilters = search || paymentMethod !== "all" || startDate || endDate;

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
            toast.error("Error al cargar los detalles de la venta");
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

    const formatPaymentMethod = (method: string) => {
        switch (method) {
            case "cash":
                return "Efectivo";
            case "card":
                return "Tarjeta";
            case "transfer":
                return "Transferencia";
            default:
                return method;
        }
    };

    const getCustomerName = (customerData: CustomerData) => {
        if (!customerData) return "Consumidor Final";
        return customerData.name || customerData.business_name || "Consumidor Final";
    };

    const handlePrint = () => {
        if (!saleDetails) return;

        const taxRate = 0.15;
        const subtotal = saleDetails.total / (1 + taxRate);

        const receipt: ReceiptData = {
            invoiceNumber: saleDetails.invoice_number,
            date: formatDateForReceipt(saleDetails.created_at),
            customerData: saleDetails.customer_data ? (saleDetails.customer_data as CustomerData) : undefined,
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
            sriData: (saleDetails.sri_access_key || saleDetails.sri_authorization_number || saleDetails.sri_status) ? {
                accessKey: saleDetails.sri_access_key,
                authorizationNumber: saleDetails.sri_authorization_number,
                authorizedAt: saleDetails.sri_authorized_at,
                status: saleDetails.sri_status,
            } : undefined,
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
            {/* Barra de Filtros Mejorada */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">Filtros de Búsqueda</h3>
                        </div>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearAll}
                                className="text-xs h-7 gap-1.5"
                            >
                                <X className="h-3.5 w-3.5" />
                                Limpiar Todo
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Búsqueda */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Search className="h-3.5 w-3.5" />
                                Búsqueda
                            </label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Factura, cliente, RUC/CI..."
                                    className="pl-9 pr-8 h-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                {search && (
                                    <button
                                        onClick={() => handleClearFilter("search")}
                                        className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label="Limpiar búsqueda"
                                        title="Limpiar búsqueda"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filtro por Método de Pago */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5" />
                                Método de Pago
                            </label>
                            <Select value={paymentMethod} onValueChange={handlePaymentMethodChange} defaultValue="all">
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Todos los métodos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los métodos</SelectItem>
                                    <SelectItem value="cash">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-3.5 w-3.5 text-green-600" />
                                            <span>Efectivo</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="card">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                                            <span>Tarjeta</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="transfer">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="h-3.5 w-3.5 text-purple-600" />
                                            <span>Transferencia</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Filtro Fecha Desde */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Fecha Desde
                            </label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    className="h-9 pr-8"
                                    value={startDate}
                                    onChange={(e) => handleStartDateChange(e.target.value)}
                                />
                                {startDate && (
                                    <button
                                        onClick={() => handleClearFilter("startDate")}
                                        className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label="Limpiar fecha desde"
                                        title="Limpiar fecha desde"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filtro Fecha Hasta */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Fecha Hasta
                            </label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    className="h-9 pr-8"
                                    value={endDate}
                                    onChange={(e) => handleEndDateChange(e.target.value)}
                                    min={startDate || undefined}
                                />
                                {endDate && (
                                    <button
                                        onClick={() => handleClearFilter("endDate")}
                                        className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label="Limpiar fecha hasta"
                                        title="Limpiar fecha hasta"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges de Filtros Activos */}
                {hasActiveFilters && (
                    <div className="px-4 py-3 bg-muted/30 border-t border-border">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground">Filtros activos:</span>
                            {search && (
                                <Badge variant="secondary" className="gap-1.5 text-xs py-1">
                                    <Search className="h-3 w-3" />
                                    {search}
                                    <button
                                        onClick={() => handleClearFilter("search")}
                                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        aria-label="Quitar filtro de búsqueda"
                                        title="Quitar filtro de búsqueda"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                            {paymentMethod !== "all" && (
                                <Badge variant="secondary" className="gap-1.5 text-xs py-1">
                                    {paymentMethod === "cash" ? (
                                        <>
                                            <DollarSign className="h-3 w-3 text-green-600" />
                                            Efectivo
                                        </>
                                    ) : paymentMethod === "card" ? (
                                        <>
                                            <CreditCard className="h-3 w-3 text-blue-600" />
                                            Tarjeta
                                        </>
                                    ) : (
                                        <>
                                            <Receipt className="h-3 w-3 text-purple-600" />
                                            Transferencia
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleClearFilter("paymentMethod")}
                                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        aria-label="Quitar filtro de método de pago"
                                        title="Quitar filtro de método de pago"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                            {startDate && (
                                <Badge variant="secondary" className="gap-1.5 text-xs py-1">
                                    <Calendar className="h-3 w-3" />
                                    Desde: {new Date(startDate).toLocaleDateString("es-ES")}
                                    <button
                                        onClick={() => handleClearFilter("startDate")}
                                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        aria-label="Quitar filtro de fecha desde"
                                        title="Quitar filtro de fecha desde"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                            {endDate && (
                                <Badge variant="secondary" className="gap-1.5 text-xs py-1">
                                    <Calendar className="h-3 w-3" />
                                    Hasta: {new Date(endDate).toLocaleDateString("es-ES")}
                                    <button
                                        onClick={() => handleClearFilter("endDate")}
                                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        aria-label="Quitar filtro de fecha hasta"
                                        title="Quitar filtro de fecha hasta"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Contenido de la Tabla */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
                {isLoading && sales.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Cargando historial...</p>
                        </div>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <Receipt className="h-12 w-12 text-muted-foreground/50" />
                            <div>
                                <p className="font-medium text-foreground">No se encontraron resultados</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {hasActiveFilters
                                        ? "Intenta ajustar los filtros de búsqueda"
                                        : "No hay registros de ventas disponibles"}
                                </p>
                            </div>
                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearAll}
                                    className="mt-2 gap-2"
                                >
                                    <X className="h-4 w-4" />
                                    Limpiar Filtros
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto overflow-y-visible">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold whitespace-nowrap">Fecha y Hora</TableHead>
                                        <TableHead className="font-semibold">Número de Factura</TableHead>
                                        <TableHead className="font-semibold">Cliente</TableHead>
                                        <TableHead className="text-center font-semibold whitespace-nowrap">Método de Pago</TableHead>
                                        <TableHead className="text-right font-semibold whitespace-nowrap">Total</TableHead>
                                        <TableHead className="text-center font-semibold whitespace-nowrap">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales.map((sale) => (
                                        <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="whitespace-nowrap font-medium">
                                                {formatDate(sale.created_at)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {sale.invoice_number}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="truncate" title={getCustomerName(sale.customer_data as CustomerData)}>
                                                        {getCustomerName(sale.customer_data as CustomerData)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center whitespace-nowrap">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        sale.payment_method === "cash"
                                                            ? "border-green-500/50 text-green-700 dark:text-green-400"
                                                            : sale.payment_method === "card"
                                                            ? "border-blue-500/50 text-blue-700 dark:text-blue-400"
                                                            : "border-purple-500/50 text-purple-700 dark:text-purple-400"
                                                    }
                                                >
                                                    {formatPaymentMethod(sale.payment_method)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                <span className="font-semibold text-foreground">
                                                    ${sale.total.toFixed(2)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center whitespace-nowrap">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewSale(sale.id)}
                                                    className="gap-2"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    Ver Detalles
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {isLoading && sales.length > 0 && (
                            <div className="flex items-center justify-center py-4 border-t">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Paginación Mejorada */}
            {sales.length > 0 && !isLoading && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-3 bg-muted/30 rounded-lg border">
                    <div className="text-sm text-muted-foreground">
                        Mostrando <span className="font-semibold text-foreground">{((page - 1) * pageSize) + 1}</span> a{" "}
                        <span className="font-semibold text-foreground">{Math.min(page * pageSize, totalCount)}</span> de{" "}
                        <span className="font-semibold text-foreground">{totalCount}</span> registros
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="gap-1.5"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Anterior</span>
                        </Button>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border">
                            <span className="text-sm font-medium">
                                Página <span className="text-foreground">{page}</span> de <span className="text-foreground">{totalPages}</span>
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="gap-1.5"
                        >
                            <span className="hidden sm:inline">Siguiente</span>
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
                                        {formatPaymentMethod(saleDetails.payment_method)}
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

                            {/* Información SRI */}
                            {(saleDetails.sri_access_key || saleDetails.sri_authorization_number || saleDetails.sri_status) && (
                                <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-indigo-200 dark:border-indigo-700">
                                        <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                        <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-100">Información SRI</h4>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        {saleDetails.sri_authorized_at && (
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Estado SRI:</p>
                                                <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">
                                                    {new Date(saleDetails.sri_authorized_at).toLocaleString("es-EC", {
                                                        year: "numeric",
                                                        month: "2-digit",
                                                        day: "2-digit",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        timeZone: "America/Guayaquil"
                                                    })}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">No. N°:</p>
                                            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">{saleDetails.invoice_number}</p>
                                        </div>
                                        
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Número de Autorización:</p>
                                            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 break-all">
                                                {saleDetails.sri_authorization_number || "PENDIENTE"}
                                            </p>
                                        </div>
                                        
                                        {saleDetails.sri_authorized_at && (
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Fecha y Hora de Autorización:</p>
                                                <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">
                                                    {new Date(saleDetails.sri_authorized_at).toLocaleString("es-EC", {
                                                        year: "numeric",
                                                        month: "2-digit",
                                                        day: "2-digit",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        timeZone: "America/Guayaquil"
                                                    })}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {saleDetails.sri_status && (
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Estado:</p>
                                                <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 uppercase">
                                                    {saleDetails.sri_status === "authorized" ? "AUTORIZADO" :
                                                     saleDetails.sri_status === "sent" ? "ENVIADO" :
                                                     saleDetails.sri_status === "pending" ? "PENDIENTE" :
                                                     saleDetails.sri_status === "rejected" ? "RECHAZADO" :
                                                     saleDetails.sri_status === "error" ? "ERROR" :
                                                     saleDetails.sri_status}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Emisión:</p>
                                            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">NORMAL</p>
                                        </div>
                                        
                                        {saleDetails.sri_access_key && (
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Clave de Acceso:</p>
                                                <p className="text-[10px] font-mono font-semibold text-indigo-900 dark:text-indigo-100 break-all leading-tight">
                                                    {saleDetails.sri_access_key}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {saleDetails.sri_error_message && (
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-medium text-red-700 dark:text-red-300 uppercase tracking-wide">Mensaje de Error:</p>
                                                <p className="text-xs font-semibold text-red-900 dark:text-red-100 break-all">
                                                    {saleDetails.sri_error_message}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {saleDetails.sri_sent_at && (
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Fecha de Envío:</p>
                                                <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">
                                                    {new Date(saleDetails.sri_sent_at).toLocaleString("es-EC", {
                                                        year: "numeric",
                                                        month: "2-digit",
                                                        day: "2-digit",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        timeZone: "America/Guayaquil"
                                                    })}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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
            <ReceiptComponent data={receiptData} printId="invoice-receipt-print" />
        </div>
    );
}
