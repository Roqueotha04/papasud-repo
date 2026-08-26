import type { StockPorUbicacion } from "@/lib/types";

/** Depósito que se muestra al entrar a Stock, si existe. */
export const UBICACION_DEFAULT = "dospanca";

function slugNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Elige la ubicación activa: query, si no Dospanca, si no la primera. */
export function resolverUbicacion(
  stock: StockPorUbicacion[],
  ubicacionId?: string | null,
): StockPorUbicacion | undefined {
  if (stock.length === 0) return undefined;
  if (ubicacionId) {
    const exacta = stock.find((s) => s.location.id === ubicacionId);
    if (exacta) return exacta;
  }
  return (
    stock.find((s) => slugNombre(s.location.nombre).includes(UBICACION_DEFAULT)) ??
    stock[0]
  );
}

export function slugArchivo(nombre: string): string {
  return slugNombre(nombre)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
