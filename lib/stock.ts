import { prisma } from "@/lib/prisma";

export type StockFila = {
  locId: string;
  variedad: string;
  lote: string;
  kg: number;
  bolsas: number;
};

export function claveStock(
  locId: string,
  variedad: string,
  lote: string,
): string {
  return `${locId}|${variedad}|${lote}`;
}

function bump(
  map: Map<string, StockFila>,
  locId: string,
  variedad: string,
  lote: string,
  kgDelta: number,
  bolsasDelta: number,
) {
  const key = claveStock(locId, variedad, lote);
  const prev = map.get(key);
  if (prev) {
    prev.kg += kgDelta;
    prev.bolsas += bolsasDelta;
    return;
  }
  map.set(key, { locId, variedad, lote, kg: kgDelta, bolsas: bolsasDelta });
}

/**
 * Stock derivado de todos los movimientos, por ubicación + variedad + lote.
 * Incluye ceros y negativos (sirve para validar salidas y detectar discrepancias).
 */
export async function calcularStockMap(): Promise<Map<string, StockFila>> {
  const items = await prisma.movementItem.findMany({
    select: {
      variedad: true,
      lote: true,
      kg: true,
      bolsas: true,
      movement: { select: { origenId: true, destinoId: true } },
    },
  });

  const map = new Map<string, StockFila>();
  for (const item of items) {
    const bolsas = item.bolsas ?? 0;
    bump(
      map,
      item.movement.destinoId,
      item.variedad,
      item.lote,
      item.kg,
      bolsas,
    );
    bump(
      map,
      item.movement.origenId,
      item.variedad,
      item.lote,
      -item.kg,
      -bolsas,
    );
  }
  return map;
}

/** Filas con stock positivo (lo que realmente hay). */
export async function calcularStock(): Promise<StockFila[]> {
  const map = await calcularStockMap();
  const filas: StockFila[] = [];
  for (const fila of map.values()) {
    if (fila.kg > 0) filas.push(fila);
  }
  return filas;
}
