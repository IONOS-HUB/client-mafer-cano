"use client";

import { ProductTable } from "@/features/products/components/product-table";
import { ServiceTable } from "@/features/products/components/service-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProductsPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                    Productos y Servicios
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    Gestiona tu catálogo de productos y servicios
                </p>
            </div>

            <Tabs defaultValue="products" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="products">Productos</TabsTrigger>
                    <TabsTrigger value="services">Servicios</TabsTrigger>
                </TabsList>
                <TabsContent value="products" className="mt-6">
                    <ProductTable />
                </TabsContent>
                <TabsContent value="services" className="mt-6">
                    <ServiceTable />
                </TabsContent>
            </Tabs>
        </div>
    );
}
