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
import { Service } from "../types";

const formSchema = z.object({
    description: z.string().min(1, "La descripción es requerida"),
});

type FormValues = z.infer<typeof formSchema>;

interface EditServiceFormProps {
    service: Service;
    onSuccess: () => void;
}

export function EditServiceForm({ service, onSuccess }: EditServiceFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: service.description,
        },
    });

    async function onSubmit(values: FormValues) {
        setIsLoading(true);
        try {
            await serviceService.updateService(service.id, values);
            toast.success("Servicio actualizado exitosamente");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar el servicio");
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
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                                <Input placeholder="Nombre del servicio" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Actualizando..." : "Actualizar Servicio"}
                </Button>
            </form>
        </Form>
    );
}
