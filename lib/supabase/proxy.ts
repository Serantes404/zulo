import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/safeNext';

// `/` es la portada pública; /login y /signup, los formularios de acceso.
const AUTH_PATHS = ['/login', '/signup'];
const isAuthPath = (path: string) => AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  // Con sesión, /login y /signup llevan directamente a donde iba (por defecto /app).
  // La portada sí se puede ver con sesión: es la página "Qué es Zulo" de la cabecera.
  if (user && isAuthPath(path)) {
    return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get('next')), request.url));
  }
  if (!user && path !== '/' && !isAuthPath(path)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return response;
}
