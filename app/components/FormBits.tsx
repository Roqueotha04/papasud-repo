"use client";

import { CircleNotch } from "@phosphor-icons/react";
import type { ReactNode } from "react";

// Piezas compartidas por los formularios de carga. Salieron de MovementForm,
// que fue el primero: cuando aparecieron ParcelaForm, MuestreoForm, ConteoForm
// y OrdenTrabajoForm, copiar el mismo fieldClass cinco veces dejaba de tener
// sentido. Todos los formularios del sistema tienen que verse iguales.

export const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-ink outline-none transition-colors placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export const textareaClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Único canal de error de los formularios: un mensaje por vez, arriba de todo. */
export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}

export function OkBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="rounded-lg border border-ok/30 bg-ok-bg px-3 py-2 text-sm text-ok"
    >
      {message}
    </p>
  );
}

export function SubmitButton({
  pending,
  idle,
  busy,
  icon,
}: {
  pending: boolean;
  idle: string;
  busy: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent-strong px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? <CircleNotch size={18} className="spin" aria-hidden /> : icon}
      {pending ? busy : idle}
    </button>
  );
}

export function formClass(): string {
  return "flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card";
}

/** Fecha de hoy en el formato que espera <input type="date">. */
export function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}
