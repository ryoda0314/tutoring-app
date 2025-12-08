import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Protected routes - redirect to login if not authenticated
    const protectedRoutes = ['/teacher', '/parent']
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    )

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If authenticated, check role-based access
    if (user && isProtectedRoute) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile && profile.role) {
            const role = String(profile.role)
            // Teacher trying to access parent routes
            if (role === 'teacher' && pathname.startsWith('/parent')) {
                const url = request.nextUrl.clone()
                url.pathname = '/teacher/dashboard'
                return NextResponse.redirect(url)
            }
            // Parent trying to access teacher routes
            if (role === 'parent' && pathname.startsWith('/teacher')) {
                const url = request.nextUrl.clone()
                url.pathname = '/parent/home'
                return NextResponse.redirect(url)
            }
        }
    }

    // Redirect authenticated users away from login page
    if (user && pathname === '/login') {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const url = request.nextUrl.clone()
        if (profile && String(profile.role) === 'teacher') {
            url.pathname = '/teacher/dashboard'
        } else {
            url.pathname = '/parent/home'
        }
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
