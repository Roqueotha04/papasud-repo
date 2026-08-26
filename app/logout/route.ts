// Salida por GET, para los casos en que no hay UI desde donde disparar la server
// action de logout: el layout manda acá cuando la cookie sobrevivió al usuario.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(COOKIE_NAME);
  return response;
}
