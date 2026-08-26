"use server";

// Server actions de AUTENTICACIÓN: login y logout.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import type { LoginInput, LoginResult } from "@/lib/types";

export async function login(input: LoginInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) {
    return { ok: false, error: "Completá email y contraseña." };
  }

  const usuario = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, nombre: true, rol: true, passwordHash: true },
  });
  if (!usuario) {
    return { ok: false, error: "Email o contraseña incorrectos." };
  }

  const valido = await verifyPassword(input.password, usuario.passwordHash);
  if (!valido) {
    return { ok: false, error: "Email o contraseña incorrectos." };
  }

  await setSessionCookie({
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
