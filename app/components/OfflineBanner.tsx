"use client";

import { useEffect, useState } from "react";
import { WifiHigh, WifiSlash } from "@phosphor-icons/react";

type EstadoConexion = "verificando" | "online" | "offline";

type Props = {
  pendientes: number;
};

function formatEntero(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

export function OfflineBanner({ pendientes }: Props) {
  const [estado, setEstado] = useState<EstadoConexion>("verificando");

  useEffect(() => {
    setEstado(navigator.onLine ? "online" : "offline");

    const handleOnline = () => setEstado("online");
    const handleOffline = () => setEstado("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const offline = estado === "offline";

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
            {estado === "verificando"
              ? "Verificando conexión…"
              : offline
                ? "Sin señal"
                : "Con señal"}
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
