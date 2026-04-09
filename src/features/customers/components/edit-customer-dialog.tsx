"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { Button } from "@/components/ui/button";
import { customerService } from "../service";
import { Customer } from "../types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const customerSchema = z
    .object({
        identification_type: z.enum(["ruc", "cedula", "passport"]),
        identification: z.string().min(1, "Identificación requerida"),
        business_name: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email("Email inválido"),
        phone: z.string().min(10, "Teléfono inválido"),
        address: z.string().min(5, "Dirección inválida"),
    })
    .superRefine((data, ctx) => {
        if (data.identification_type === "ruc" && !/^\d{13}$/.test(data.identification)) {
            ctx.addIssue({ code: "custom", message: "RUC debe tener exactamente 13 dígitos", path: ["identification"] });
        } else if (data.identification_type === "cedula" && !/^\d{10}$/.test(data.identification)) {
            ctx.addIssue({ code: "custom", message: "Cédula debe tener exactamente 10 dígitos", path: ["identification"] });
        } else if (data.identification_type === "passport" && data.identification.length < 5) {
            ctx.addIssue({ code: "custom", message: "Pasaporte inválido (mínimo 5 caracteres)", path: ["identification"] });
        }
    })
    .refine(
        (data) => {
            if (data.identification_type === "ruc") {
                return data.business_name && data.business_name.length > 0;
            } else {
                return data.name && data.name.length > 0;
            }
        },
        {
            message: "Nombre o razón social requerido",
            path: ["name"],
        }
    );

type FormValues = z.infer<typeof customerSchema>;

interface EditCustomerDialogProps {
    customer: Customer;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditCustomerDialog({
    customer,
    isOpen,
    onClose,
    onSuccess,
}: EditCustomerDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            identification_type: customer.identification_type,
            identification: customer.identification,
            business_name: customer.business_name || "",
            name: customer.name || "",
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
        },
    });

    // Actualizar valores cuando cambie el customer
    useEffect(() => {
        if (customer && isOpen) {
            form.reset({
                identification_type: customer.identification_type,
                identification: customer.identification,
                business_name: customer.business_name || "",
                name: customer.name || "",
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
            });
        }
    }, [customer, isOpen, form]);

    const identificationType = form.watch("identification_type");

    async function onSubmit(values: FormValues) {
        setIsLoading(true);
        try {
            await customerService.updateCustomer(customer.id, values);
            toast.success("Cliente actualizado exitosamente");
            onSuccess();
        } catch (error: any) {
            console.error(error);
            if (error?.code === "23505") {
                toast.error("Ya existe un cliente con esta identificación");
            } else {
                toast.error("Error al actualizar el cliente");
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Cliente</DialogTitle>
                    <DialogDescription>
                        Modifica la información del cliente. Los campos marcados con * son obligatorios.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="identification_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Identificación *</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ruc">RUC</SelectItem>
                                            <SelectItem value="cedula">Cédula</SelectItem>
                                            <SelectItem value="passport">Pasaporte</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="identification"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de Identificación *</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ej: 1003573167001"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {identificationType === "ruc" ? (
                            <FormField
                                control={form.control}
                                name="business_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Razón Social *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ej: MAFER CANO S.A."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre Completo *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ej: Juan Pérez"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="ejemplo@correo.com"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Teléfono *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ej: 0998007892"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección *</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ej: Av. Camilo Ponce y Av. Ricardo Sánchez"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
