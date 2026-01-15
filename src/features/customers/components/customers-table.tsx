"use client";

import { useEffect, useState, useCallback } from "react";
import { customerService } from "../service";
import { Customer } from "../types";
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
import { Loader2, ChevronLeft, ChevronRight, Search, Filter, X, Edit, User, Mail, Phone, MapPin, Calendar, CreditCard } from "lucide-react";
import { EditCustomerDialog } from "./edit-customer-dialog";
import { toast } from "sonner";

export function CustomersTable() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    // Filtros
    const [search, setSearch] = useState("");
    const [identificationType, setIdentificationType] = useState("all");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Estado para el diálogo de edición
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Debounce para búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Función para cargar clientes
    const loadCustomers = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters = {
                search: debouncedSearch,
                identificationType,
            };
            const { data, count } = await customerService.getCustomersWithFilters(page, pageSize, filters);
            setCustomers(data as Customer[]);
            if (count !== null) {
                setTotalCount(count);
                setTotalPages(Math.ceil(count / pageSize));
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar los clientes");
        } finally {
            setIsLoading(false);
        }
    }, [page, debouncedSearch, identificationType]);

    // Cargar clientes cuando cambien los filtros o la página
    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    const handleIdentificationTypeChange = (value: string) => {
        setIdentificationType(value);
        setPage(1);
    };

    const handleClearFilter = (filterType: "search" | "identificationType") => {
        switch (filterType) {
            case "search":
                setSearch("");
                break;
            case "identificationType":
                setIdentificationType("all");
                break;
        }
        setPage(1);
    };

    const handleClearAll = () => {
        setSearch("");
        setIdentificationType("all");
        setPage(1);
    };

    const hasActiveFilters = search || identificationType !== "all";

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsEditDialogOpen(true);
    };

    const handleEditSuccess = () => {
        setIsEditDialogOpen(false);
        setSelectedCustomer(null);
        loadCustomers();
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

    const formatIdentificationType = (type: string) => {
        switch (type) {
            case "ruc":
                return "RUC";
            case "cedula":
                return "Cédula";
            case "passport":
                return "Pasaporte";
            default:
                return type;
        }
    };

    return (
        <div className="space-y-4">
            {/* Barra de Filtros */}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Búsqueda */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Search className="h-3.5 w-3.5" />
                                Búsqueda
                            </label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Nombre, RUC/CI, email, teléfono..."
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

                        {/* Filtro por Tipo de Identificación */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5" />
                                Tipo de Identificación
                            </label>
                            <Select value={identificationType} onValueChange={handleIdentificationTypeChange} defaultValue="all">
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Todos los tipos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los tipos</SelectItem>
                                    <SelectItem value="ruc">RUC</SelectItem>
                                    <SelectItem value="cedula">Cédula</SelectItem>
                                    <SelectItem value="passport">Pasaporte</SelectItem>
                                </SelectContent>
                            </Select>
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
                            {identificationType !== "all" && (
                                <Badge variant="secondary" className="gap-1.5 text-xs py-1">
                                    <CreditCard className="h-3 w-3" />
                                    {formatIdentificationType(identificationType)}
                                    <button
                                        onClick={() => handleClearFilter("identificationType")}
                                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        aria-label="Quitar filtro de tipo"
                                        title="Quitar filtro de tipo"
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
                {isLoading && customers.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Cargando clientes...</p>
                        </div>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <User className="h-12 w-12 text-muted-foreground/50" />
                            <div>
                                <p className="font-medium text-foreground">No se encontraron resultados</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {hasActiveFilters
                                        ? "Intenta ajustar los filtros de búsqueda"
                                        : "No hay clientes registrados"}
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
                                        <TableHead className="font-semibold">Cliente</TableHead>
                                        <TableHead className="font-semibold">Tipo</TableHead>
                                        <TableHead className="font-semibold">Identificación</TableHead>
                                        <TableHead className="font-semibold">Email</TableHead>
                                        <TableHead className="font-semibold">Teléfono</TableHead>
                                        <TableHead className="font-semibold">Dirección</TableHead>
                                        <TableHead className="font-semibold whitespace-nowrap">Fecha de Registro</TableHead>
                                        <TableHead className="text-center font-semibold whitespace-nowrap">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customers.map((customer) => (
                                        <TableRow key={customer.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span className="truncate" title={customer.name || customer.business_name || 'N/A'}>
                                                        {customer.name || customer.business_name || 'N/A'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {formatIdentificationType(customer.identification_type)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs">{customer.identification}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="truncate" title={customer.email}>
                                                        {customer.email}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>{customer.phone}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="truncate max-w-[200px]" title={customer.address}>
                                                        {customer.address}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {formatDate(customer.created_at)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center whitespace-nowrap">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(customer)}
                                                    className="gap-2"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    Editar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {isLoading && customers.length > 0 && (
                            <div className="flex items-center justify-center py-4 border-t">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Paginación */}
            {customers.length > 0 && !isLoading && (
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

            {/* Diálogo de Edición */}
            {selectedCustomer && (
                <EditCustomerDialog
                    customer={selectedCustomer}
                    isOpen={isEditDialogOpen}
                    onClose={() => {
                        setIsEditDialogOpen(false);
                        setSelectedCustomer(null);
                    }}
                    onSuccess={handleEditSuccess}
                />
            )}
        </div>
    );
}
