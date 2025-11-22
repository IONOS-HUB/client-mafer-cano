"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
    const [isCleaning, setIsCleaning] = useState(false);

    const handleClearDatabase = async () => {
        if (!confirm("¿ESTÁS SEGURO? Esto borrará TODOS los productos, servicios, inventario y ventas. Esta acción no se puede deshacer.")) {
            return;
        }

        if (!confirm("¿De verdad? ¡Se perderá todo!")) {
            return;
        }

        setIsCleaning(true);
        try {
            const response = await fetch("/api/clear-db", {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Error al limpiar la base de datos");
            }

            toast.success("Base de datos limpiada correctamente");
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error(error);
            toast.error("Error al limpiar la base de datos");
        } finally {
            setIsCleaning(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-white">Configuración</h1>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-zinc-900 dark:text-white">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Zona de Peligro
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Acciones destructivas para el sistema.
                    </p>
                </div>

                <div className="p-6 bg-red-50/50 dark:bg-red-950/10">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="font-medium text-red-900 dark:text-red-200">Limpiar Base de Datos</h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                Elimina permanentemente todos los productos, servicios, historial de inventario y ventas.
                                Úsalo solo para resetear el sistema antes de producción.
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={handleClearDatabase}
                            disabled={isCleaning}
                            className="shrink-0"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isCleaning ? "Limpiando..." : "Resetear Todo"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
