"use client";

import { useRouter } from "next/navigation";
import { useId, useOptimistic, useTransition } from "react";
import { fieldClass } from "@/app/components/FormBits";

type Opcion = { value: string; label: string };

type Props = {
  action: string;
  name: string;
  label: string;
  value: string;
  options: Opcion[];
  emptyOption?: Opcion;
  /** Query params que hay que conservar al cambiar este select. */
  preserve?: Record<string, string | undefined>;
  hint?: string;
  /** El label queda para lectores de pantalla: el título de la sección ya lo dice. */
  hideLabel?: boolean;
};

/**
 * Select que viaja en la query string. Sin JS el form GET hace lo mismo.
 * Lo usan Stock, Proyección e Indicadores: misma pieza, mismo aspecto.
 */
export function QuerySelect({
  action,
  name,
  label,
  value,
  options,
  emptyOption,
  preserve,
  hint,
  hideLabel = false,
}: Props) {
  const router = useRouter();
  const id = useId();
  const [pendiente, startTransition] = useTransition();
  const [seleccion, setSeleccion] = useOptimistic(value);

  function aplicar(next: string) {
    const query = new URLSearchParams();
    if (preserve) {
      for (const [k, v] of Object.entries(preserve)) {
        if (v) query.set(k, v);
      }
    }
    if (next) query.set(name, next);
    const qs = query.toString();

    startTransition(() => {
      setSeleccion(next);
      router.push(qs ? `${action}?${qs}` : action, { scroll: false });
    });
  }

  return (
    <form
      method="get"
      action={action}
      aria-busy={pendiente}
      className="min-w-0 sm:w-56"
    >
      {preserve
        ? Object.entries(preserve).map(([k, v]) =>
            v ? <input key={k} type="hidden" name={k} value={v} /> : null,
          )
        : null}
      <div className="flex min-w-0 flex-col gap-1.5">
        <label
          htmlFor={id}
          className={hideLabel ? "sr-only" : "text-sm font-medium text-ink"}
        >
          {label}
        </label>
        <select
          id={id}
          name={name}
          className={fieldClass}
          value={seleccion}
          onChange={(e) => aplicar(e.target.value)}
        >
          {emptyOption ? (
            <option value={emptyOption.value}>{emptyOption.label}</option>
          ) : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {hint && !hideLabel ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      <noscript>
        <button
          type="submit"
          className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-accent-strong px-4 text-sm font-medium text-white"
        >
          Aplicar
        </button>
      </noscript>
    </form>
  );
}
