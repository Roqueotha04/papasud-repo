// Indicadores de campo: producción, rendimiento y exportación por parcela,
// derivados de los movimientos de ingreso (CAMPO_A_FRIO, INGRESO_TOLVAS,
// INGRESO_TREVELIN). Mismo estilo que lib/stock.ts: una query, acumulación
// en memoria, sin N+1.

import { prisma } from "@/lib/prisma";
import { kgComercialesPorParcela, TIPOS_INGRESO } from "@/lib/trazabilidad";

export type IndicadoresFiltros = {
  campania?: string;
  variedad?: string;
};

export type ParcelaIndicador = {
  parcelaId: string;
  codigo: string;
  variedad: string;
  campania: string;
  superficieHa: number;
  produccionKg: number;
  rendimientoKgHa: number;
  kgExportacion: number;
  pctExportacion: number;
  bolsas: number;
};

export type VariedadIndicador = {
  variedad: string;
  parcelas: number;
  superficieHa: number;
  produccionKg: number;
  rendimientoKgHa: number;
  kgExportacion: number;
  pctExportacion: number;
  bolsas: number;
};

export type TotalesIndicador = {
  parcelas: number;
  superficieHa: number;
  produccionKg: number;
  rendimientoKgHa: number;
  kgExportacion: number;
  pctExportacion: number;
  bolsas: number;
};

export type IndicadoresResult = {
  porParcela: ParcelaIndicador[];
  porVariedad: VariedadIndicador[];
  totales: TotalesIndicador;
};

function divide(numerador: number, denominador: number): number {
  return denominador > 0 ? numerador / denominador : 0;
}

/**
 * Agregación de producción/rendimiento/exportación por parcela, por variedad
 * y totales generales. El rendimiento y el % de exportación de las
 * agregaciones (variedad y total) NO son el promedio de los rendimientos de
 * cada parcela: se recalculan como kg totales / ha totales (idem exportación).
 */
export async function calcularIndicadores(
  filtros: IndicadoresFiltros = {},
): Promise<IndicadoresResult> {
  const [parcelas, comerciales] = await Promise.all([
    prisma.parcela.findMany({
      where: {
        ...(filtros.campania ? { campania: { nombre: filtros.campania } } : {}),
        ...(filtros.variedad ? { variedad: filtros.variedad } : {}),
      },
      select: {
        id: true,
        codigo: true,
        variedad: true,
        superficieHa: true,
        campania: { select: { nombre: true } },
        movimientos: {
          where: { tipo: { in: [...TIPOS_INGRESO] } },
          select: {
            items: {
              select: { kg: true, bolsas: true, categoria: true },
            },
          },
        },
      },
      orderBy: [{ variedad: "asc" }, { codigo: "asc" }],
    }),
    // Los kg exportados NO se pueden leer de los movimientos de ingreso: la
    // categoría comercial se asigna aguas abajo, después de tamañar. Se
    // atribuyen a la parcela siguiendo el par (variedad, lote). Ver
    // lib/trazabilidad.ts.
    kgComercialesPorParcela(),
  ]);

  const porParcela: ParcelaIndicador[] = parcelas.map((p) => {
    let produccionKg = 0;
    let bolsas = 0;
    for (const mov of p.movimientos) {
      for (const item of mov.items) {
        produccionKg += item.kg;
        bolsas += item.bolsas ?? 0;
      }
    }
    const kgExportacion = comerciales.get(p.id)?.exportacion ?? 0;
    return {
      parcelaId: p.id,
      codigo: p.codigo,
      variedad: p.variedad,
      campania: p.campania.nombre,
      superficieHa: p.superficieHa,
      produccionKg,
      rendimientoKgHa: divide(produccionKg, p.superficieHa),
      kgExportacion,
      pctExportacion: divide(kgExportacion, produccionKg),
      bolsas,
    };
  });

  const porVariedadMap = new Map<
    string,
    Omit<VariedadIndicador, "rendimientoKgHa" | "pctExportacion">
  >();
  for (const fila of porParcela) {
    const prev = porVariedadMap.get(fila.variedad);
    if (prev) {
      prev.parcelas += 1;
      prev.superficieHa += fila.superficieHa;
      prev.produccionKg += fila.produccionKg;
      prev.kgExportacion += fila.kgExportacion;
      prev.bolsas += fila.bolsas;
    } else {
      porVariedadMap.set(fila.variedad, {
        variedad: fila.variedad,
        parcelas: 1,
        superficieHa: fila.superficieHa,
        produccionKg: fila.produccionKg,
        kgExportacion: fila.kgExportacion,
        bolsas: fila.bolsas,
      });
    }
  }

  const porVariedad: VariedadIndicador[] = [...porVariedadMap.values()]
    .map((v) => ({
      ...v,
      rendimientoKgHa: divide(v.produccionKg, v.superficieHa),
      pctExportacion: divide(v.kgExportacion, v.produccionKg),
    }))
    .sort((a, b) => a.variedad.localeCompare(b.variedad, "es"));

  const totalesBase = porParcela.reduce(
    (acc, fila) => ({
      parcelas: acc.parcelas + 1,
      superficieHa: acc.superficieHa + fila.superficieHa,
      produccionKg: acc.produccionKg + fila.produccionKg,
      kgExportacion: acc.kgExportacion + fila.kgExportacion,
      bolsas: acc.bolsas + fila.bolsas,
    }),
    { parcelas: 0, superficieHa: 0, produccionKg: 0, kgExportacion: 0, bolsas: 0 },
  );

  const totales: TotalesIndicador = {
    ...totalesBase,
    rendimientoKgHa: divide(totalesBase.produccionKg, totalesBase.superficieHa),
    pctExportacion: divide(totalesBase.kgExportacion, totalesBase.produccionKg),
  };

  return { porParcela, porVariedad, totales };
}

/** Variedades distintas entre las parcelas sembradas, para armar filtros. */
export async function listarVariedades(): Promise<string[]> {
  const rows = await prisma.parcela.findMany({
    select: { variedad: true },
    distinct: ["variedad"],
    orderBy: { variedad: "asc" },
  });
  return rows.map((r) => r.variedad);
}

// ---------------------------------------------------------------------------
// Formato es-AR (helpers propios de este archivo)
// ---------------------------------------------------------------------------

export function formatNumero(n: number, decimales = 0): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: decimales,
    minimumFractionDigits: decimales,
  }).format(n);
}

export function formatHa(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatPct(ratio: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(ratio);
}
