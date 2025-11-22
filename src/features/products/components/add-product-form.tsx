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
import { useScanDetection } from "../hooks/use-scan-detection";

const formSchema = z.object({
    barcode: z.string().optional(),
    description: z.string().min(1, "La descripción es requerida"),
    price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
    stock: z.number().int().min(0, "El stock debe ser mayor o igual a 0"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddProductFormProps {
    onSuccess: () => void;
}

export function AddProductForm({ onSuccess }: AddProductFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            barcode: "",
            description: "",
            price: 0,
            stock: 0,
        },
    });

    // Auto-fill barcode field when scanning
    useScanDetection({
        onScan: (code) => {
            form.setValue("barcode", code);
            toast.info(`Código escaneado: ${code}`);
            // Optional: Focus description after scan
            const descInput = document.getElementById("description-input");
            if (descInput) descInput.focus();
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            // Check if product exists (only if barcode is provided)
            if (values.barcode && values.barcode.trim() !== "") {
                const existing = await productService.getProductByBarcode(values.barcode);
                if (existing) {
                    toast.error("Ya existe un producto con este código de barras");
                    return;
                }
            }

            // If barcode is empty, set it to a generated value or empty string
            const productData = {
                ...values,
                barcode: values.barcode?.trim() || `TEMP-${Date.now()}`, // Temporary code if empty
            };

            await productService.createProduct(productData);
            toast.success("Producto creado exitosamente");
            form.reset();
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Error al crear el producto");
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
                            <FormLabel>Código de Barras (Opcional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Escanea o escribe..." {...field} />
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
                                <Input id="description-input" placeholder="Nombre del producto" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
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
                                <FormLabel>Stock Inicial</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Guardando..." : "Crear Producto"}
                </Button>
            </form>
        </Form>
    );
}
