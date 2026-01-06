import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );

    try {
        // 1. Eliminar items de venta (referencian a productos, servicios y ventas)
        const { error: errorSaleItems } = await supabase
            .from('sale_items')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Borrar todo

        if (errorSaleItems) {
            console.error('Error deleting sale_items:', errorSaleItems);
            throw errorSaleItems;
        }

        // 2. Eliminar ajustes de stock (referencian a productos)
        const { error: errorAdjustments } = await supabase
            .from('stock_adjustments')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (errorAdjustments) {
            console.error('Error deleting stock_adjustments:', errorAdjustments);
            throw errorAdjustments;
        }

        // 3. Eliminar productos
        const { error: errorProducts } = await supabase
            .from('products')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (errorProducts) {
            console.error('Error deleting products:', errorProducts);
            throw errorProducts;
        }

        // 4. Eliminar servicios
        const { error: errorServices } = await supabase
            .from('services')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (errorServices) {
            console.error('Error deleting services:', errorServices);
            throw errorServices;
        }

        // 5. Eliminar ventas (ya sin items)
        const { error: errorSales } = await supabase
            .from('sales')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (errorSales) {
            console.error('Error deleting sales:', errorSales);
            throw errorSales;
        }

        return NextResponse.json({ message: 'Base de datos limpiada exitosamente' });
    } catch (error) {
        console.error('Error clearing database:', error);
        return NextResponse.json(
            { error: 'Error al limpiar la base de datos', details: error },
            { status: 500 }
        );
    }
}
