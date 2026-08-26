"use client";

import { useActionState } from "react";
import { Stack } from "@phosphor-icons/react";
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
    <div className="flex min-h-[80dvh] items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-card">
        <div className="mb-6 flex items-center gap-2.5">
          <Stack size={24} weight="fill" className="shrink-0 text-accent" aria-hidden />
          <div>
            <p className="text-base font-semibold tracking-tight text-ink">
              Raíz Tech
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
  );
}
