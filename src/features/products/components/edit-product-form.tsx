import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { productService } from "../service";
import { toast } from "sonner";
import { Product } from "../types";

const formSchema = z.object({
    barcode: z.string().min(1, "El código de barras es requerido"),
    description: z.string().min(1, "La descripción es requerida"),
    price: z.number().positive("El precio debe ser mayor a 0"),
    stock: z.number().min(0, "El stock no puede ser negativo"),
});

type FormValues = z.infer<typeof formSchema>;

interface EditProductFormProps {
    product: Product;
    onSuccess: () => void;
}

export function EditProductForm({ product, onSuccess }: EditProductFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            barcode: product.barcode,
            description: product.description,
            price: product.price,
            stock: product.stock,
        },
    });

    async function onSubmit(values: FormValues) {
        setIsLoading(true);
        try {
            await productService.updateProduct(product.id, values);
            toast.success("Producto actualizado exitosamente");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar el producto");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Código de Barras</FormLabel>
                            <FormControl>
                                <Input placeholder="7501234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                                <Input placeholder="Nombre del producto" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Precio</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Stock</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Actualizando..." : "Actualizar Producto"}
                </Button>
            </form>
        </Form>
    );
}
