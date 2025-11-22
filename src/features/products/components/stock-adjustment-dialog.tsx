import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { productService } from "../service";
import { inventoryService } from "@/features/inventory/service";
import { toast } from "sonner";
import { AdjustmentType } from "@/features/inventory/types";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ADD_REASONS = [
    "Compra a Proveedor",
    "Devolución de Cliente",
    "Hallazgo en Inventario",
    "Corrección de Stock",
    "Otro"
];

const SUBTRACT_REASONS = [
    "Producto Dañado/Defectuoso",
    "Caducidad",
    "Uso Interno",
    "Pérdida o Robo",
    "Devolución a Proveedor",
    "Corrección de Stock",
    "Otro"
];

const formSchema = z.object({
    adjustment_type: z.enum(["add", "subtract"]),
    quantity: z.number().int().min(1, "La cantidad debe ser mayor a 0"),
    reasonType: z.string().min(1, "Seleccione un motivo"),
    customReason: z.string().optional(),
}).refine((data) => {
    if (data.reasonType === "Otro") {
        return !!data.customReason && data.customReason.length >= 3;
    }
    return true;
}, {
    message: "El motivo debe tener al menos 3 caracteres",
    path: ["customReason"],
});

type FormValues = z.infer<typeof formSchema>;

interface StockAdjustmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    currentStock: number;
    productName: string;
    onSuccess: () => void;
}

export function StockAdjustmentDialog({
    isOpen,
    onClose,
    productId,
    currentStock,
    productName,
    onSuccess,
}: StockAdjustmentDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            adjustment_type: "add",
            quantity: 1,
            reasonType: "",
            customReason: "",
        },
    });

    const adjustmentType = form.watch("adjustment_type");
    const quantity = form.watch("quantity");
    const reasonType = form.watch("reasonType");

    // Reset reason when adjustment type changes
    useEffect(() => {
        form.setValue("reasonType", "");
        form.setValue("customReason", "");
    }, [adjustmentType, form]);

    // Reset form when dialog opens
    useEffect(() => {
        if (isOpen) {
            form.reset({
                adjustment_type: "add",
                quantity: 1,
                reasonType: "",
                customReason: "",
            });
        }
    }, [isOpen, form]);

    const currentReasons = adjustmentType === "add" ? ADD_REASONS : SUBTRACT_REASONS;

    const calculateNewStock = () => {
        if (adjustmentType === "add") {
            return currentStock + (quantity || 0);
        } else {
            return currentStock - (quantity || 0);
        }
    };

    const newStock = calculateNewStock();

    const handleSave = async (values: FormValues) => {
        const calculatedNewStock = calculateNewStock();

        if (calculatedNewStock < 0) {
            toast.error("El stock no puede ser negativo");
            return;
        }

        const finalReason = values.reasonType === "Otro" ? values.customReason : values.reasonType;

        setIsLoading(true);
        try {
            // Update product stock
            await productService.updateStock(productId, calculatedNewStock);

            // Create adjustment record
            await inventoryService.createAdjustment({
                product_id: productId,
                adjustment_type: values.adjustment_type as AdjustmentType,
                quantity: values.quantity,
                reason: finalReason || "Ajuste de stock",
                previous_stock: currentStock,
                new_stock: calculatedNewStock,
            });

            toast.success("Stock actualizado correctamente");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar stock");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Ajustar Stock - {productName}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                        {/* Resumen de Stock */}
                        <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">Stock Actual:</span>
                                <span className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">{currentStock}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Nuevo Stock:</span>
                                <span
                                    className={cn(
                                        "text-2xl font-bold transition-colors",
                                        newStock < 0 ? "text-red-500" :
                                            newStock > currentStock ? "text-green-500" :
                                                newStock < currentStock ? "text-orange-500" : "text-zinc-700"
                                    )}
                                >
                                    {newStock}
                                </span>
                            </div>
                        </div>

                        {/* Selector de Tipo de Ajuste (Visual) */}
                        <FormField
                            control={form.control}
                            name="adjustment_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Ajuste</FormLabel>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div
                                            onClick={() => field.onChange("add")}
                                            className={cn(
                                                "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900",
                                                field.value === "add"
                                                    ? "border-green-500 bg-green-50/50 dark:bg-green-900/20"
                                                    : "border-transparent bg-zinc-100 dark:bg-zinc-800"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-8 w-8 rounded-full flex items-center justify-center",
                                                field.value === "add" ? "bg-green-500 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                                            )}>
                                                <ArrowUp className="h-5 w-5" />
                                            </div>
                                            <span className={cn(
                                                "font-medium text-sm",
                                                field.value === "add" ? "text-green-700 dark:text-green-400" : "text-zinc-600"
                                            )}>Agregar Stock</span>
                                        </div>

                                        <div
                                            onClick={() => field.onChange("subtract")}
                                            className={cn(
                                                "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900",
                                                field.value === "subtract"
                                                    ? "border-red-500 bg-red-50/50 dark:bg-red-900/20"
                                                    : "border-transparent bg-zinc-100 dark:bg-zinc-800"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-8 w-8 rounded-full flex items-center justify-center",
                                                field.value === "subtract" ? "bg-red-500 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                                            )}>
                                                <ArrowDown className="h-5 w-5" />
                                            </div>
                                            <span className={cn(
                                                "font-medium text-sm",
                                                field.value === "subtract" ? "text-red-700 dark:text-red-400" : "text-zinc-600"
                                            )}>Restar Stock</span>
                                        </div>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-6">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cantidad</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="1"
                                                className="text-lg font-medium"
                                                placeholder="0"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="reasonType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Motivo del Ajuste</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione un motivo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {currentReasons.map((reason) => (
                                                        <SelectItem key={reason} value={reason}>
                                                            {reason}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {reasonType === "Otro" && (
                                    <FormField
                                        control={form.control}
                                        name="customReason"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Especifique el motivo..."
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    onClose();
                                    form.reset();
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading || newStock < 0}>
                                {isLoading ? "Guardando..." : "Guardar Ajuste"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
