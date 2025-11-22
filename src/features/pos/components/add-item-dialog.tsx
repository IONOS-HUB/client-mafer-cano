"use client";

import { useState, useEffect } from "react";
import { Product, Service } from "@/features/products/types";
import { productService, serviceService } from "@/features/products/service";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, Wrench } from "lucide-react";
import { toast } from "sonner";

interface AddItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAddProduct: (product: Product, quantity: number) => void;
    onAddService: (service: Service, price: number) => void;
}

export function AddItemDialog({
    isOpen,
    onClose,
    onAddProduct,
    onAddService,
}: AddItemDialogProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [servicePrice, setServicePrice] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [productsData, servicesData] = await Promise.all([
                productService.getProducts(),
                serviceService.getServices(),
            ]);
            setProducts(productsData);
            setServices(servicesData);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar productos y servicios");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredProducts = products.filter(
        (p) =>
            p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.barcode.includes(searchQuery)
    );

    const filteredServices = services.filter((s) =>
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddProduct = (product: Product) => {
        if (product.stock <= 0) {
            toast.error("Producto sin stock disponible");
            return;
        }
        onAddProduct(product, 1);
        toast.success(`Agregado: ${product.description}`);
    };

    const handleAddService = (service: Service) => {
        const price = servicePrice[service.id];
        if (!price || price <= 0) {
            toast.error("Ingresa un precio válido para el servicio");
            return;
        }
        onAddService(service, price);
        toast.success(`Agregado: ${service.description}`);
        setServicePrice({ ...servicePrice, [service.id]: 0 });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Agregar Producto o Servicio</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o código..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="products" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="products">
                                <Package className="h-4 w-4 mr-2" />
                                Productos
                            </TabsTrigger>
                            <TabsTrigger value="services">
                                <Wrench className="h-4 w-4 mr-2" />
                                Servicios
                            </TabsTrigger>
                        </TabsList>

                        {/* Products Tab */}
                        <TabsContent value="products" className="mt-4">
                            <div className="max-h-[400px] overflow-y-auto space-y-2">
                                {isLoading ? (
                                    <p className="text-center py-8 text-muted-foreground">
                                        Cargando...
                                    </p>
                                ) : filteredProducts.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">
                                        No se encontraron productos
                                    </p>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <div
                                            key={product.id}
                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium">{product.description}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Código: {product.barcode} | Stock: {product.stock}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-green-600">
                                                    ${product.price.toFixed(2)}
                                                </span>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAddProduct(product)}
                                                    disabled={product.stock <= 0}
                                                >
                                                    Agregar
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        {/* Services Tab */}
                        <TabsContent value="services" className="mt-4">
                            <div className="max-h-[400px] overflow-y-auto space-y-2">
                                {isLoading ? (
                                    <p className="text-center py-8 text-muted-foreground">
                                        Cargando...
                                    </p>
                                ) : filteredServices.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">
                                        No se encontraron servicios
                                    </p>
                                ) : (
                                    filteredServices.map((service) => (
                                        <div
                                            key={service.id}
                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium">{service.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Precio"
                                                    value={servicePrice[service.id] || ""}
                                                    onChange={(e) =>
                                                        setServicePrice({
                                                            ...servicePrice,
                                                            [service.id]: parseFloat(e.target.value) || 0,
                                                        })
                                                    }
                                                    className="w-28"
                                                    step="0.01"
                                                    min="0"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAddService(service)}
                                                >
                                                    Agregar
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
