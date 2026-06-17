import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    "/",
    "/login/programas-sociales",
    "/login/servicios-sociales",
    "/terminos-condiciones",
    "/politica-privacidad",
  ];

  // Si es una ruta pública, permitir acceso
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Verificar si hay token en las cookies
  const token = request.cookies.get("auth_token");

  // Si no hay token y está intentando acceder a ruta protegida, redirigir al home
  if (!token && (pathname.startsWith("/programas-sociales") || pathname.startsWith("/servicios-sociales"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
