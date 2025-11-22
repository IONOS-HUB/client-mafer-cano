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
import { serviceService } from "../service";
import { toast } from "sonner";

const formSchema = z.object({
    description: z.string().min(1, "La descripción es requerida"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddServiceFormProps {
    onSuccess: () => void;
}

export function AddServiceForm({ onSuccess }: AddServiceFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
        },
    });

    async function onSubmit(values: FormValues) {
        setIsLoading(true);
        try {
            await serviceService.createService(values);
            toast.success("Servicio creado exitosamente");
            form.reset();
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Error al crear el servicio");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción del Servicio</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej: Instalación, Mantenimiento..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Guardando..." : "Crear Servicio"}
                </Button>
            </form>
        </Form>
    );
}
