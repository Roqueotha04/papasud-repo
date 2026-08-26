"use client";

import { useSyncExternalStore } from "react";
import { WifiHigh, WifiSlash } from "@phosphor-icons/react";

type Props = {
  pendientes: number;
};

function formatEntero(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

// El estado de conexión es un dato del navegador, no de React: se lee con
// useSyncExternalStore en vez de copiarlo a un useState desde un efecto. En el
// servidor no hay navigator, así que se asume con señal y el cliente corrige
// al hidratar.
function suscribir(alCambiar: () => void) {
  window.addEventListener("online", alCambiar);
  window.addEventListener("offline", alCambiar);
  return () => {
    window.removeEventListener("online", alCambiar);
    window.removeEventListener("offline", alCambiar);
  };
}

export function OfflineBanner({ pendientes }: Props) {
  const online = useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );

  const offline = !online;

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
        offline ? "border-danger/25 bg-danger-bg" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {offline ? (
          <WifiSlash size={22} className="shrink-0 text-danger" aria-hidden />
        ) : (
          <WifiHigh size={22} className="shrink-0 text-ok" aria-hidden />
        )}
        <div>
          <p
            className={`text-sm font-medium ${offline ? "text-danger" : "text-ink"}`}
          >
            {offline ? "Sin señal" : "Con señal"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {offline
              ? "Los registros nuevos quedan en cola local, esperando conexión."
              : "Hay conexión disponible para sincronizar la cola pendiente."}
          </p>
        </div>
      </div>
      <p className="num shrink-0 text-sm font-medium text-ink">
        {formatEntero(pendientes)} pendiente{pendientes === 1 ? "" : "s"}
      </p>
    </div>
  );
}
