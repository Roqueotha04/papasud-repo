"use client";

import { useState } from "react";
import { MapPinLine } from "@phosphor-icons/react";
import { OfflineBanner } from "../components/OfflineBanner";
import { OfflineQueue } from "../components/OfflineQueue";

const REGISTROS_INICIALES = 6;

export default function OfflinePage() {
  const [pendientes, setPendientes] = useState(REGISTROS_INICIALES);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <MapPinLine
            size={26}
            weight="fill"
            className="shrink-0 text-accent"
            aria-hidden
          />
          <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
            Modo campo
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-muted md:text-base">
          En el lote no hay señal de celular. Hoy los movimientos y las
          órdenes de trabajo se anotan en papel o se arman de memoria al
          volver a la oficina.
        </p>
      </header>

      <OfflineBanner pendientes={pendientes} />

      <section aria-labelledby="como-funciona-heading" className="max-w-3xl">
        <h2
          id="como-funciona-heading"
          className="text-base font-semibold text-ink"
        >
          Cómo funciona la sincronización
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-ink">Se carga en el lote</p>
            <p className="mt-1 text-sm text-muted">
              El ingeniero agrónomo completa el movimiento o la orden de
              trabajo ahí mismo, sin esperar señal.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Queda en cola local</p>
            <p className="mt-1 text-sm text-muted">
              El registro se guarda en el dispositivo, marcado como pendiente
              de sincronizar.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">
              Se sincroniza al recuperar señal
            </p>
            <p className="mt-1 text-sm text-muted">
              Al volver la conexión, la cola se envía y queda sincronizada.
            </p>
          </div>
        </div>
      </section>

      <OfflineQueue onPendingChange={setPendientes} />
    </main>
  );
}
