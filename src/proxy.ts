import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
    const res = NextResponse.next()
    const supabase = createServerClient(
        process.env.PUBLIC_SUPABASE_URL!,
        process.env.PUBLIC_SUPABASE_ANON!,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll().map((cookie) => ({
                        name: cookie.name,
                        value: cookie.value,
                    }))
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        req.cookies.set(name, value)
                        res.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const {
        data: { session },
    } = await supabase.auth.getSession()

    // Si no hay sesión y el usuario intenta acceder a una ruta protegida
    if (!session && req.nextUrl.pathname !== '/login') {
        // Permitir acceso a recursos estáticos y api si es necesario, pero bloquear páginas
        // Aquí asumimos que todo lo que no sea login requiere auth, excepto assets estáticos
        if (!req.nextUrl.pathname.startsWith('/_next') &&
            !req.nextUrl.pathname.startsWith('/static') &&
            !req.nextUrl.pathname.startsWith('/logo') &&
            !req.nextUrl.pathname.startsWith('/qr') &&
            !req.nextUrl.pathname.includes('.')) { // Archivos con extensión (imágenes, etc)
            return NextResponse.redirect(new URL('/login', req.url))
        }
    }

    // Si hay sesión y el usuario intenta acceder al login
    if (session && req.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/', req.url))
    }

    return res
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (logo, qr)
         */
        '/((?!_next/static|_next/image|favicon.ico|logo/|qr/).*)',
    ],
}

