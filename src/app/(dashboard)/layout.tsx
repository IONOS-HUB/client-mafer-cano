"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Package, BarChart3, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

const navigation = [
    { name: "Punto de Venta", href: "/pos", icon: ShoppingCart },
    { name: "Productos y Servicios", href: "/products", icon: Package },
    { name: "Historial de Inventario", href: "/inventory", icon: BarChart3 },
    { name: "Configuración", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClientComponentClient();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            router.push("/login");
            toast.success("Sesión cerrada exitosamente");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            toast.error("Error al cerrar sesión");
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <header className="bg-white dark:bg-zinc-900 border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Image src="/logo/mafercano.png" alt="Logo" width={100} height={100} />
                        </div>
                        <div className="flex items-center gap-4">
                            <nav className="flex space-x-1">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="text-zinc-600 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:bg-red-950/30"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Salir
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
