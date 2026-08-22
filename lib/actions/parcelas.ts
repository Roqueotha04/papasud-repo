// Modulo de datos de PARCELAS (ficha integral: campo + muestreos + trazabilidad).
// NO lleva "use server": lo consumen unicamente server components
// (app/parcelas/**, ParcelaFicha), nunca un client component. Un archivo
// "use server" solo puede exportar funciones async, y aca hay constantes y
// tipos (UMBRAL_EXPORTACION_MM, ClaseCalibre) que son parte de la API.
// Self-contenido a propósito: no depende de lib/indicadores.ts, lib/proyeccion.ts
// ni de otras actions en desarrollo paralelo. Sólo usa @/lib/prisma (estable).

import { prisma } from "@/lib/prisma";
import { kgComercialesPorParcela } from "@/lib/trazabilidad";
import type { Categoria, MovementType } from "@/app/generated/prisma/enums";

// Los únicos MovementType que traen mercadería DESDE el campo (parcelaId no nulo).
const TIPOS_INGRESO: MovementType[] = [
  "INGRESO_TOLVAS",
  "INGRESO_TREVELIN",
  "CAMPO_A_FRIO",
];

// ---------- Clasificación de calibres ----------
//
// Cada muestreo trae sus propios cortes de rango como texto libre ("40-55",
// ">60", "<25", ...) y no coinciden entre muestreos. Para poder comparar y
// proyectar, convertimos cada rango a un milimetraje representativo:
//   - Rango cerrado "a-b"  -> punto medio (a+b)/2.
//   - Rango abierto ">a"   -> a + 5 (la cola alta es angosta: en los datos
//     reales ">60" casi no pesa, así que un valor apenas por encima del piso
//     alcanza para clasificarlo bien).
//   - Rango abierto "<a"   -> a - 5 (mismo criterio para la cola baja).
//
// Con ese milimetraje se clasifica en las tres salidas comerciales del
// negocio, con los umbrales acordados:
//   >= 45mm            -> exportación
//   [30mm, 45mm)       -> sin chicas
//   < 30mm             -> descarte / semilla
export const UMBRAL_EXPORTACION_MM = 45;
export const UMBRAL_SIN_CHICAS_MM = 30;

export type ClaseCalibre = "exportacion" | "sin_chicas" | "descarte_semilla";

function calibreRepresentativoMm(rango: string): number {
  const limpio = rango.trim();
  if (limpio.startsWith(">")) {
    const n = Number(limpio.slice(1));
    return Number.isFinite(n) ? n + 5 : 0;
  }
  if (limpio.startsWith("<")) {
    const n = Number(limpio.slice(1));
    return Number.isFinite(n) ? n - 5 : 0;
  }
  const partes = limpio.split("-").map((p) => Number(p));
  if (partes.length === 2 && partes.every((n) => Number.isFinite(n))) {
    return (partes[0]! + partes[1]!) / 2;
  }
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

export function clasificarCalibre(rango: string): ClaseCalibre {
  const mm = calibreRepresentativoMm(rango);
  if (mm >= UMBRAL_EXPORTACION_MM) return "exportacion";
  if (mm >= UMBRAL_SIN_CHICAS_MM) return "sin_chicas";
  return "descarte_semilla";
}

// ---------- Listado ----------

export type ParcelaListItem = {
  id: string;
  codigo: string;
  variedad: string;
  pivote: string | null;
  superficieHa: number;
  campaniaNombre: string;
  kgTotal: number;
  rendimientoKgHa: number;
  tieneMuestreos: boolean;
};

export async function getParcelas(): Promise<ParcelaListItem[]> {
  const parcelas = await prisma.parcela.findMany({
    select: {
      id: true,
      codigo: true,
      variedad: true,
      pivote: true,
      superficieHa: true,
      campania: { select: { nombre: true } },
      movimientos: {
        where: { tipo: { in: TIPOS_INGRESO } },
        select: { items: { select: { kg: true } } },
      },
      _count: { select: { muestreos: true } },
    },
    orderBy: [{ codigo: "asc" }],
  });

  return parcelas.map((p) => {
    const kgTotal = p.movimientos.reduce(
      (sum, m) => sum + m.items.reduce((s, it) => s + it.kg, 0),
      0,
    );
    return {
      id: p.id,
      codigo: p.codigo,
      variedad: p.variedad,
      pivote: p.pivote,
      superficieHa: p.superficieHa,
      campaniaNombre: p.campania.nombre,
      kgTotal,
      rendimientoKgHa: p.superficieHa > 0 ? kgTotal / p.superficieHa : 0,
      tieneMuestreos: p._count.muestreos > 0,
    };
  });
}

// ---------- Ficha ----------

export type MovimientoIngresoItem = {
  variedad: string;
  lote: string;
  kg: number;
  categoria: Categoria | null;
};

export type MovimientoIngresoRow = {
  id: string;
  fecha: string; // ISO
  remito: string | null;
  tipo: MovementType;
  origenNombre: string;
  destinoNombre: string;
  items: MovimientoIngresoItem[];
};

export type CalibreClasificado = {
  rango: string;
  ordenRango: number;
  pesoKg: number;
  cantidad: number;
  pctPesoMuestra: number; // % sobre el peso total de ESE muestreo
  clase: ClaseCalibre;
};

export type MuestreoConProyeccion = {
  id: string;
  fecha: string; // ISO
  tratamiento: string | null;
  pesoTotalKg: number;
  nTuberculos: number;
  tallos: number | null;
  tallosPorMetro: number | null;
  calibres: CalibreClasificado[];
  pctExportacion: number;
  pctSinChicas: number;
  pctDescarteSemilla: number;
};

export type ProyeccionAgregada = {
  pctExportacion: number;
  pctSinChicas: number;
  pctDescarteSemilla: number;
};

export type ParcelaFicha = {
  id: string;
  codigo: string;
  variedad: string;
  superficieHa: number;
  pivote: string | null;
  tercio: number | null;
  campaniaNombre: string;
  campaniaDesde: string;
  campaniaHasta: string;

  kgTotal: number;
  bolsasTotal: number;
  rendimientoKgHa: number;
  pctExportacionReal: number | null; // null si todavía no hay ingresos

  muestreos: MuestreoConProyeccion[];
  proyeccion: ProyeccionAgregada | null; // ponderada por peso de muestra, null si no hay muestreos

  movimientos: MovimientoIngresoRow[];
};

export async function getParcelaFicha(id: string): Promise<ParcelaFicha | null> {
  const parcela = await prisma.parcela.findUnique({
    where: { id },
    select: {
      id: true,
      codigo: true,
      variedad: true,
      superficieHa: true,
      pivote: true,
      tercio: true,
      campania: { select: { nombre: true, desde: true, hasta: true } },
      movimientos: {
        where: { tipo: { in: TIPOS_INGRESO } },
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          fecha: true,
          remito: true,
          tipo: true,
          origen: { select: { nombre: true } },
          destino: { select: { nombre: true } },
          items: {
            select: { variedad: true, lote: true, kg: true, categoria: true },
          },
        },
      },
      muestreos: {
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          fecha: true,
          tratamiento: true,
          pesoTotalKg: true,
          nTuberculos: true,
          tallos: true,
          tallosPorMetro: true,
          calibres: {
            orderBy: { ordenRango: "asc" },
            select: { rango: true, ordenRango: true, pesoKg: true, cantidad: true },
          },
        },
      },
    },
  });

  if (!parcela) return null;

  let kgTotal = 0;
  let bolsasTotal = 0;

  // La categoria comercial se asigna aguas abajo (despues de tamanar), en
  // movimientos que ya no tienen parcelaId. Los kg exportados se atribuyen a la
  // parcela siguiendo el par (variedad, lote). Ver lib/trazabilidad.ts.
  const comerciales = await kgComercialesPorParcela();
  const kgExportacion = comerciales.get(parcela.id)?.exportacion ?? 0;

  const movimientos: MovimientoIngresoRow[] = parcela.movimientos.map((m) => {
    const kgMov = m.items.reduce((s, it) => s + it.kg, 0);
    kgTotal += kgMov;
    return {
      id: m.id,
      fecha: m.fecha.toISOString(),
      remito: m.remito,
      tipo: m.tipo,
      origenNombre: m.origen.nombre,
      destinoNombre: m.destino.nombre,
      items: m.items.map((it) => ({
        variedad: it.variedad,
        lote: it.lote,
        kg: it.kg,
        categoria: it.categoria,
      })),
    };
  });

  // bolsas: MovementItem no siempre tiene bolsas (graneles no las tienen).
  // Se buscan aparte para no cargar el select principal con un campo opcional
  // que sólo se usa acá.
  const movementIds = movimientos.map((m) => m.id);
  if (movementIds.length > 0) {
    const bolsasRows = await prisma.movementItem.findMany({
      where: { movementId: { in: movementIds } },
      select: { bolsas: true },
    });
    bolsasTotal = bolsasRows.reduce((s, r) => s + (r.bolsas ?? 0), 0);
  }

  const muestreos: MuestreoConProyeccion[] = parcela.muestreos.map((m) => {
    const calibres: CalibreClasificado[] = m.calibres.map((c) => ({
      rango: c.rango,
      ordenRango: c.ordenRango,
      pesoKg: c.pesoKg,
      cantidad: c.cantidad,
      pctPesoMuestra: m.pesoTotalKg > 0 ? (c.pesoKg / m.pesoTotalKg) * 100 : 0,
      clase: clasificarCalibre(c.rango),
    }));

    const kgExport = calibres
      .filter((c) => c.clase === "exportacion")
      .reduce((s, c) => s + c.pesoKg, 0);
    const kgSinChicas = calibres
      .filter((c) => c.clase === "sin_chicas")
      .reduce((s, c) => s + c.pesoKg, 0);
    const kgDescarte = calibres
      .filter((c) => c.clase === "descarte_semilla")
      .reduce((s, c) => s + c.pesoKg, 0);
    const base = kgExport + kgSinChicas + kgDescarte || 1;

    return {
      id: m.id,
      fecha: m.fecha.toISOString(),
      tratamiento: m.tratamiento,
      pesoTotalKg: m.pesoTotalKg,
      nTuberculos: m.nTuberculos,
      tallos: m.tallos,
      tallosPorMetro: m.tallosPorMetro,
      calibres,
      pctExportacion: (kgExport / base) * 100,
      pctSinChicas: (kgSinChicas / base) * 100,
      pctDescarteSemilla: (kgDescarte / base) * 100,
    };
  });

  // Proyección agregada de la parcela: se ponderan todos los muestreos por su
  // peso de muestra (no un promedio simple entre tratamientos).
  let proyeccion: ProyeccionAgregada | null = null;
  if (parcela.muestreos.length > 0) {
    let expKg = 0;
    let sinChicasKg = 0;
    let descarteKg = 0;
    for (const m of parcela.muestreos) {
      for (const c of m.calibres) {
        const clase = clasificarCalibre(c.rango);
        if (clase === "exportacion") expKg += c.pesoKg;
        else if (clase === "sin_chicas") sinChicasKg += c.pesoKg;
        else descarteKg += c.pesoKg;
      }
    }
    const totalClasificado = expKg + sinChicasKg + descarteKg || 1;
    proyeccion = {
      pctExportacion: (expKg / totalClasificado) * 100,
      pctSinChicas: (sinChicasKg / totalClasificado) * 100,
      pctDescarteSemilla: (descarteKg / totalClasificado) * 100,
    };
  }

  return {
    id: parcela.id,
    codigo: parcela.codigo,
    variedad: parcela.variedad,
    superficieHa: parcela.superficieHa,
    pivote: parcela.pivote,
    tercio: parcela.tercio,
    campaniaNombre: parcela.campania.nombre,
    campaniaDesde: parcela.campania.desde.toISOString(),
    campaniaHasta: parcela.campania.hasta.toISOString(),

    kgTotal,
    bolsasTotal,
    rendimientoKgHa: parcela.superficieHa > 0 ? kgTotal / parcela.superficieHa : 0,
    pctExportacionReal: kgTotal > 0 ? (kgExportacion / kgTotal) * 100 : null,

    muestreos,
    proyeccion,

    movimientos,
  };
}
