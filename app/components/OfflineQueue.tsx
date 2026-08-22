"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  CircleNotch,
  ClipboardText,
  Package,
} from "@phosphor-icons/react";

type TipoRegistro = "movimiento" | "orden";
type EstadoRegistro = "pendiente" | "sincronizado";

type RegistroCola = {
  id: string;
  tipo: TipoRegistro;
  resumen: string;
  ubicacion: string;
  hora: string;
  estado: EstadoRegistro;
};

const REGISTROS_INICIALES: readonly RegistroCola[] = [
  {
    id: "mov-224",
    tipo: "movimiento",
    resumen: "Ingreso a tolvas - agata lote 224 - 40.520 kg",
    ubicacion: "Santa Ana",
    hora: "07:48",
    estado: "pendiente",
  },
  {
    id: "mov-821",
    tipo: "movimiento",
    resumen: "Envío a frío - asterix lote 821 - 30.460 kg",
    ubicacion: "Santa Ana - Dospanca",
    hora: "08:05",
    estado: "pendiente",
  },
  {
    id: "orden-37a",
    tipo: "orden",
    resumen: "Orden de trabajo - Dithane N80 + Engeo",
    ubicacion: "Parcela 37A",
    hora: "08:12",
    estado: "pendiente",
  },
  {
    id: "mov-310",
    tipo: "movimiento",
    resumen: "Entrega a cliente - spunta lote 310 - 34.260 kg",
    ubicacion: "La Unión del Sur",
    hora: "08:30",
    estado: "pendiente",
  },
  {
    id: "mov-351",
    tipo: "movimiento",
    resumen: "Conteo físico - daifla lote 351 - 27.480 kg",
    ubicacion: "Galpón",
    hora: "08:41",
    estado: "pendiente",
  },
  {
    id: "orden-41",
    tipo: "orden",
    resumen: "Orden de trabajo - Daconil",
    ubicacion: "Parcela 41",
    hora: "08:55",
    estado: "pendiente",
  },
];

const PASO_MS = 400;

function formatEntero(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

function prefiereMovimientoReducido(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Props = {
  onPendingChange?: (pendientes: number) => void;
};

export function OfflineQueue({ onPendingChange }: Props) {
  const [registros, setRegistros] = useState<RegistroCola[]>(() => [
    ...REGISTROS_INICIALES,
  ]);
  const [sincronizando, setSincronizando] = useState(false);
  const timeoutsRef = useRef<number[]>([]);

  const pendientes = registros.filter((r) => r.estado === "pendiente");
  const sincronizados = registros.length - pendientes.length;
  const todoSincronizado = pendientes.length === 0;

  useEffect(() => {
    onPendingChange?.(pendientes.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendientes.length]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const handleSincronizar = useCallback(() => {
    if (pendientes.length === 0 || sincronizando) return;

    const idsPendientes = pendientes.map((r) => r.id);

    if (prefiereMovimientoReducido()) {
      setRegistros((prev) =>
        prev.map((r) =>
          idsPendientes.includes(r.id) ? { ...r, estado: "sincronizado" } : r,
        ),
      );
      return;
    }

    setSincronizando(true);
    idsPendientes.forEach((id, index) => {
      const t = window.setTimeout(
        () => {
          setRegistros((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, estado: "sincronizado" } : r,
            ),
          );
          if (index === idsPendientes.length - 1) {
            setSincronizando(false);
          }
        },
        (index + 1) * PASO_MS,
      );
      timeoutsRef.current.push(t);
    });
  }, [pendientes, sincronizando]);

  const handleReiniciar = useCallback(() => {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = [];
    setSincronizando(false);
    setRegistros([...REGISTROS_INICIALES]);
  }, []);

  return (
    <section aria-labelledby="cola-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="cola-heading" className="text-lg font-semibold text-ink">
            Cola de sincronización
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {formatEntero(pendientes.length)} pendiente
            {pendientes.length === 1 ? "" : "s"} de sincronizar ·{" "}
            {formatEntero(sincronizados)} sincronizado
            {sincronizados === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReiniciar}
            className="h-10 rounded-lg border border-border px-3 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Reiniciar
          </button>
          <button
            type="button"
            onClick={handleSincronizar}
            disabled={todoSincronizado || sincronizando}
            aria-disabled={todoSincronizado || sincronizando}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent-strong px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sincronizando ? (
              <CircleNotch size={18} className="spin" aria-hidden />
            ) : (
              <CheckCircle size={18} weight="bold" aria-hidden />
            )}
            {sincronizando ? "Sincronizando…" : "Sincronizar"}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {todoSincronizado
          ? "Todo sincronizado."
          : `${pendientes.length} registros pendientes de sincronizar, ${sincronizados} ya sincronizados.`}
      </div>

      {todoSincronizado && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-ok-bg px-4 py-4">
          <CheckCircle
            size={22}
            weight="fill"
            className="mt-0.5 shrink-0 text-ok"
            aria-hidden
          />
          <div>
            <p className="font-medium text-ink">Todo sincronizado</p>
            <p className="mt-0.5 text-sm text-muted">
              La cola local quedó vacía. Vista de ejemplo: no hay guardado
              real en servidor.
            </p>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {registros.map((registro) => (
          <li
            key={registro.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-card"
          >
            {registro.tipo === "movimiento" ? (
              <Package
                size={20}
                className="shrink-0 text-accent"
                aria-hidden
              />
            ) : (
              <ClipboardText
                size={20}
                className="shrink-0 text-accent"
                aria-hidden
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {registro.resumen}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {registro.ubicacion} · {registro.hora}
              </p>
            </div>
            {registro.estado === "pendiente" ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 text-xs font-medium text-muted">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-muted"
                  aria-hidden
                />
                Pendiente de sincronizar
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-xs font-medium text-ok">
                <CheckCircle size={14} weight="fill" aria-hidden />
                Sincronizado
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
