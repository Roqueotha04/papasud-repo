import { prisma } from "@/lib/prisma";
import type { MovementType } from "@/app/generated/prisma/enums";

// Atribución de kg exportados a la parcela de campo que los produjo.
//
// Por qué hace falta un módulo aparte: la categoría comercial NO se decide en el
// campo. Cuando la papa entra a planta viene como GRANEL, RECIBO o SEMILLA; recién
// aguas abajo (ENVIO_A_FRIO, ENTREGA_CLIENTE), después de tamañar, se clasifica en
// EXPORTACION, SIN_CHICAS, DESCARTE_PARAGUAY, etc. Y esos movimientos posteriores ya
// no tienen `parcelaId`: la trazabilidad al campo la sostiene el par (variedad, lote).
//
// Entonces: buscar `categoria: EXPORTACION` entre los movimientos de ingreso da
// siempre 0. El dato real se reconstruye en dos saltos:
//
//   parcela --(movimiento de ingreso)--> (variedad, lote) --(movimientos aguas abajo)--> kg por categoría
//
// Es exactamente la cadena de trazabilidad del negocio, no un rodeo.

export const TIPOS_INGRESO: readonly MovementType[] = [
  "INGRESO_TOLVAS",
  "INGRESO_TREVELIN",
  "CAMPO_A_FRIO",
] as const;

export function clavePartida(variedad: string, lote: string): string {
  return `${variedad}|${lote}`;
}

export type KgPorCategoria = {
  exportacion: number;
  sinChicas: number;
  descarte: number;
  otras: number;
  total: number;
};

function vacio(): KgPorCategoria {
  return { exportacion: 0, sinChicas: 0, descarte: 0, otras: 0, total: 0 };
}

/**
 * Mapa `parcelaId -> kg por categoría comercial`, atribuidos vía (variedad, lote).
 *
 * Dos queries, sin N+1. Cuando una misma partida (variedad+lote) fue alimentada por
 * más de una parcela, los kg se reparten proporcionalmente a lo que cada parcela
 * aportó a esa partida: es la única atribución defendible sin inventar precisión.
 */
export async function kgComercialesPorParcela(): Promise<
  Map<string, KgPorCategoria>
> {
  const [ingresos, aguasAbajo] = await Promise.all([
    prisma.movementItem.findMany({
      where: { movement: { tipo: { in: [...TIPOS_INGRESO] }, parcelaId: { not: null } } },
      select: {
        variedad: true,
        lote: true,
        kg: true,
        movement: { select: { parcelaId: true } },
      },
    }),
    prisma.movementItem.findMany({
      where: { movement: { tipo: { notIn: [...TIPOS_INGRESO] } } },
      select: { variedad: true, lote: true, kg: true, categoria: true },
    }),
  ]);

  // Cuánto aportó cada parcela a cada partida, y el total de la partida.
  const aporte = new Map<string, Map<string, number>>();
  const totalPartida = new Map<string, number>();
  for (const item of ingresos) {
    const parcelaId = item.movement.parcelaId;
    if (!parcelaId) continue;
    const key = clavePartida(item.variedad, item.lote);
    let porParcela = aporte.get(key);
    if (!porParcela) {
      porParcela = new Map();
      aporte.set(key, porParcela);
    }
    porParcela.set(parcelaId, (porParcela.get(parcelaId) ?? 0) + item.kg);
    totalPartida.set(key, (totalPartida.get(key) ?? 0) + item.kg);
  }

  const salida = new Map<string, KgPorCategoria>();
  const sumar = (parcelaId: string, campo: keyof KgPorCategoria, kg: number) => {
    let acc = salida.get(parcelaId);
    if (!acc) {
      acc = vacio();
      salida.set(parcelaId, acc);
    }
    acc[campo] += kg;
    acc.total += kg;
  };

  for (const item of aguasAbajo) {
    const key = clavePartida(item.variedad, item.lote);
    const porParcela = aporte.get(key);
    const total = totalPartida.get(key);
    if (!porParcela || !total) continue; // partida sin origen de campo trazable

    const campo: keyof KgPorCategoria =
      item.categoria === "EXPORTACION"
        ? "exportacion"
        : item.categoria === "SIN_CHICAS"
          ? "sinChicas"
          : item.categoria === "DESCARTE_PARAGUAY"
            ? "descarte"
            : "otras";

    for (const [parcelaId, kgAportados] of porParcela) {
      sumar(parcelaId, campo, item.kg * (kgAportados / total));
    }
  }

  return salida;
}
