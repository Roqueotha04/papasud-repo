// Sesión y contraseñas. Módulo puro (sin "use server"): lo llaman tanto Server
// Components (layout.tsx) como proxy.ts como las server actions de lib/actions/auth.ts.

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UsuarioDTO } from "@/lib/types";

const COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 días

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Falta JWT_SECRET en el entorno");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSession(usuario: UsuarioDTO): Promise<string> {
  return new SignJWT({
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuario.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());
}

export type SessionPayload = {
  id: string;
  email: string;
  nombre: string;
  rol: UsuarioDTO["rol"];
};

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.nombre !== "string" ||
      typeof payload.rol !== "string"
    ) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      rol: payload.rol as UsuarioDTO["rol"],
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(usuario: UsuarioDTO): Promise<void> {
  const token = await signSession(usuario);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Usuario logueado, resuelto contra la base (no solo el payload del token) para
// que un usuario borrado o con rol cambiado no siga operando con el JWT viejo.
export async function getUsuarioActual(): Promise<UsuarioDTO | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const usuario = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, nombre: true, rol: true },
  });
  return usuario;
}
