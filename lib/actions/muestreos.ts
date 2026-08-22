"use server";

// Server actions de MUESTREOS PRE-COSECHA Y PROYECCIÓN.
// Se consumen directo desde app/muestreos/page.tsx vía
// `@/lib/actions/muestreos`, no vía el barrel `@/lib/actions` (lo actualiza
// otra sesión).

import { prisma } from "@/lib/prisma";
import { proyectarMuestreo } from "@/lib/proyeccion";
import type { ProyeccionMuestreo } from "@/lib/proyeccion";
import { kgComercialesPorParcela } from "@/lib/trazabilidad";
import type { MovementType } from "@/app/generated/prisma/enums";

// Mismos tipos de movimiento "de ingreso desde campo" que usa
// lib/indicadores.ts para producción/rendimiento por parcela.
const TIPOS_INGRESO: MovementType[] = [
  "INGRESO_TOLVAS",
  "INGRESO_TREVELIN",
  "CAMPO_A_FRIO",
];

export type MuestreoDTO = {
  id: string;
  fecha: string;
  tratamiento: string | null;
  pesoTotalKg: number;
  nTuberculos: number;
  tallos: number | null;
  tallosPorMetro: number | null;
  proyeccion: ProyeccionMuestreo;
};

// Contraste proyectado (muestreo) vs real para la parcela. pctExportacion es
// null cuando la parcela no tiene ingresos registrados todavía (no hay nada
// contra qué contrastar).
//
// Los kg exportados NO salen de los movimientos de ingreso: la categoría
// comercial se asigna aguas abajo, después de tamañar. Se atribuyen a la
// parcela siguiendo el par (variedad, lote). Ver lib/trazabilidad.ts.
export type ProduccionRealParcela = {
  totalKgIngreso: number;
  kgExportacion: number;
  pctExportacion: number | null;
};

export type ParcelaMuestreosDTO = {
  parcelaId: string;
  codigo: string;
  variedad: string;
  superficieHa: number;
  muestreos: MuestreoDTO[];
  real: ProduccionRealParcela;
};

/**
 * Todos los muestreos pre-cosecha, agrupados por parcela, con su proyección
 * comercial y, para contrastar, la producción real de esa parcela derivada
 * de sus movimientos de ingreso. Dos queries (muestreos, movimientos de las
 * parcelas con muestreo): sin N+1.
 */
export async function getMuestreos(): Promise<ParcelaMuestreosDTO[]> {
  const muestreos = await prisma.muestreo.findMany({
    orderBy: [{ fecha: "asc" }],
    select: {
      id: true,
      parcelaId: true,
      fecha: true,
      tratamiento: true,
      pesoTotalKg: true,
      nTuberculos: true,
      tallos: true,
      tallosPorMetro: true,
      parcela: {
        select: { id: true, codigo: true, variedad: true, superficieHa: true },
      },
      calibres: {
        select: { rango: true, ordenRango: true, pesoKg: true, cantidad: true },
        orderBy: { ordenRango: "asc" },
      },
    },
  });

  if (muestreos.length === 0) return [];

  const parcelaIds = [...new Set(muestreos.map((m) => m.parcelaId))];

  const [itemsIngreso, comerciales] = await Promise.all([
    prisma.movementItem.findMany({
      where: {
        movement: {
          parcelaId: { in: parcelaIds },
          tipo: { in: TIPOS_INGRESO },
        },
      },
      select: {
        kg: true,
        movement: { select: { parcelaId: true } },
      },
    }),
    kgComercialesPorParcela(),
  ]);

  const realByParcela = new Map<string, { totalKg: number; kgExport: number }>();
  for (const id of parcelaIds) {
    realByParcela.set(id, {
      totalKg: 0,
      kgExport: comerciales.get(id)?.exportacion ?? 0,
    });
  }
  for (const item of itemsIngreso) {
    const pid = item.movement.parcelaId;
    if (!pid) continue;
    const acc = realByParcela.get(pid);
    if (!acc) continue;
    acc.totalKg += item.kg;
  }

  // Ordenar tratamientos de forma estable dentro de cada parcela para que
  // el ensayo Rootex / S/Rootex se lea siempre en el mismo orden.
  function ordenTratamiento(t: string | null): number {
    if (t === "Rootex") return 0;
    if (t === "S/Rootex") return 1;
    return 2;
  }

  const porParcela = new Map<string, ParcelaMuestreosDTO>();
  for (const m of muestreos) {
    let entry = porParcela.get(m.parcelaId);
    if (!entry) {
      const real = realByParcela.get(m.parcelaId) ?? { totalKg: 0, kgExport: 0 };
      entry = {
        parcelaId: m.parcelaId,
        codigo: m.parcela.codigo,
        variedad: m.parcela.variedad,
        superficieHa: m.parcela.superficieHa,
        muestreos: [],
        real: {
          totalKgIngreso: real.totalKg,
          kgExportacion: real.kgExport,
          pctExportacion: real.totalKg > 0 ? (real.kgExport / real.totalKg) * 100 : null,
        },
      };
      porParcela.set(m.parcelaId, entry);
    }
    entry.muestreos.push({
      id: m.id,
      fecha: m.fecha.toISOString(),
      tratamiento: m.tratamiento,
      pesoTotalKg: m.pesoTotalKg,
      nTuberculos: m.nTuberculos,
      tallos: m.tallos,
      tallosPorMetro: m.tallosPorMetro,
      proyeccion: proyectarMuestreo({
        pesoTotalKg: m.pesoTotalKg,
        nTuberculos: m.nTuberculos,
        tallos: m.tallos,
        tallosPorMetro: m.tallosPorMetro,
        calibres: m.calibres,
      }),
    });
  }

  const parcelas = [...porParcela.values()];
  for (const p of parcelas) {
    p.muestreos.sort(
      (a, b) => ordenTratamiento(a.tratamiento) - ordenTratamiento(b.tratamiento),
    );
  }
  parcelas.sort(
    (a, b) =>
      a.variedad.localeCompare(b.variedad, "es") ||
      a.codigo.localeCompare(b.codigo, "es", { numeric: true }),
  );

  return parcelas;
}
