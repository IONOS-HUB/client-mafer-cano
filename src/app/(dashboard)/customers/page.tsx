"use client";

import { CustomersTable } from "@/features/customers/components/customers-table";

export default function CustomersPage() {
    return (
        <div className="w-full -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-6 max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                    Clientes
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    Gestiona la información de tus clientes. Puedes ver y editar sus datos.
                </p>
            </div>

            <div className="w-full">
                <CustomersTable />
            </div>
        </div>
    );
}
