"use client";

import Image from "next/image";
import { useActionState } from "react";
import { login } from "@/lib/actions";
import type { LoginResult } from "@/lib/types";

const ESTADO_INICIAL: LoginResult = { ok: false, error: "" };

async function loginAction(
  _prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  return login({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    ESTADO_INICIAL,
  );

  return (
    // Fixed y a pantalla completa: el layout raíz sigue reservando su padding
    // habitual alrededor, pero acá no hay sidebar (usuario null) y la pantalla
    // de login tiene que ocupar el viewport entero para el split 40/60.
    <div className="fixed inset-0 flex">
      <div className="flex h-full w-full items-center justify-center overflow-y-auto px-6 py-10 lg:w-[40%]">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <Image
              src="/papasud-logo.webp"
              alt=""
              width={40}
              height={40}
              className="shrink-0 rounded-md"
              priority
            />
            <div>
              <p className="text-lg font-semibold tracking-tight text-ink">
                Papasud Tech
              </p>
              <p className="text-xs text-muted">Gestión agronómica</p>
            </div>
          </div>

          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              />
            </div>

            {!state.ok && state.error ? (
              <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 rounded-md bg-accent-strong px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>

      <div className="relative hidden h-full lg:block lg:w-[60%]">
        <Image
          src="/login.jpg"
          alt=""
          fill
          sizes="(min-width: 1024px) 60vw, 0px"
          priority
          className="object-cover"
        />
      </div>
    </div>
  );
}
