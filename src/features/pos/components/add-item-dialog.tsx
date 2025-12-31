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
import { cn } from "@/lib/utils";
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
  const [servicePrice, setServicePrice] = useState<{ [key: string]: number }>(
    {}
  );

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
      <DialogContent
        aria-describedby={undefined}
        className="sm:max-w-[700px] max-h-[80vh]"
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">
            Agregar Producto o Servicio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 rounded-lg border-2 focus:border-primary"
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
                      className="flex items-center justify-between p-4 border-2 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100/50 dark:hover:from-blue-950/20 dark:hover:to-blue-900/10 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-base text-slate-900 dark:text-slate-100">
                          {product.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            Código:{" "}
                            <span className="font-medium">
                              {product.barcode}
                            </span>
                          </span>
                          <span>•</span>
                          <span>
                            Stock:{" "}
                            <span
                              className={cn(
                                "font-medium",
                                product.stock > 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              )}
                            >
                              {product.stock}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                          ${product.price.toFixed(2)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleAddProduct(product)}
                          disabled={product.stock <= 0}
                          className="rounded-lg font-semibold shadow-sm hover:shadow-md"
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
                      className="flex items-center justify-between p-4 border-2 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100/50 dark:hover:from-purple-950/20 dark:hover:to-purple-900/10 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-sm"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-base text-slate-900 dark:text-slate-100">
                          {service.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={servicePrice[service.id] || ""}
                            onChange={(e) =>
                              setServicePrice({
                                ...servicePrice,
                                [service.id]: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-32 pl-7 border-2 focus:border-purple-500 rounded-lg"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddService(service)}
                          className="rounded-lg font-semibold shadow-sm hover:shadow-md bg-purple-600 hover:bg-purple-700"
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
