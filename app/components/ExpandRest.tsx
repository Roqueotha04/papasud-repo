"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

/**
 * Muestra un recorte y, al pedir el resto, lo deja a la vista.
 * No hay "ver menos": si se quiere volver al recorte, se sale de la página.
 */
export function ExpandRest({
  label,
  extra,
  children,
  className = "border-t border-border px-3 py-2.5",
}: {
  label: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  if (abierto) return children;

  return (
    <button
      type="button"
      onClick={() => setAbierto(true)}
      className={`flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm text-muted transition-colors hover:bg-bg hover:text-ink ${className}`}
    >
      <span className="flex items-center gap-1.5">
        <CaretDown size={14} aria-hidden />
        {label}
      </span>
      {extra ? <span className="num shrink-0">{extra}</span> : null}
    </button>
  );
}
