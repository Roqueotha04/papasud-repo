// Next.js 16 renombró middleware.ts a proxy.ts (misma función, corre en
// runtime Node por default). Protege todas las rutas salvo /login.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const payload = token ? await verifySessionToken(token) : null;
  const isLogin = request.nextUrl.pathname === "/login";

  if (!payload && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (payload && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Además de los internos de Next, excluye cualquier archivo estático de
  // `public/` (tiene punto de extensión: login.jpg, papasud-logo.webp,
  // favicon.ico, etc.). Sin esto, el fetch interno del optimizador de
  // imágenes -que no manda la cookie de sesión- rebota contra /login y la
  // imagen nunca llega a renderizarse en la propia pantalla de login.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
