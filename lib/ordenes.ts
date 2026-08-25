// Órdenes de trabajo: lectura y derivación de costos.
//
// NO lleva "use server": lo consume únicamente el server component de
// app/ordenes, nunca un client component, y exporta constantes y tipos además
// de funciones (un archivo "use server" solo puede exportar funciones async).
//
// Ningún costo está guardado en la base. El costo de una línea es
// dosis/ha × superficie de la parcela × precio del insumo, y todo lo demás
// (costo de la orden, costo por hectárea, costo por categoría) se suma a partir
// de ahí. Una query con includes y agregación en memoria: sin N+1.

import type {
  CategoriaInsumo,
  EstadoOrden,
  Herramienta,
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// Las etiquetas y el formato viven en lib/ordenes-format.ts, que no importa
// Prisma y por eso puede usarlo el formulario de alta. Se reexportan para que
// un server component siga resolviendo todo desde un solo import.
export * from "@/lib/ordenes-format";

export type LineaDTO = {
  id: string;
  marca: string;
  principioActivo: string;
  categoria: CategoriaInsumo;
  dosisHa: number;
  unidad: string;
  /** Cantidad total de insumo: dosis/ha × ha de la parcela. */
  totalUso: number;
  costoUsd: number;
};

export type OrdenDTO = {
  id: string;
  numero: number;
  fechaEmision: string;
  fechaTarea: string;
  aplicador: string;
  herramienta: Herramienta;
  estado: EstadoOrden;
  observaciones: string | null;
  parcela: { codigo: string; variedad: string; superficieHa: number } | null;
  lineas: LineaDTO[];
  costoTotal: number;
};

export type CostoPorParcela = {
  codigo: string;
  variedad: string;
  superficieHa: number;
  ordenes: number;
  costo: number;
  costoHa: number;
};

export type CostoPorCategoria = {
  categoria: CategoriaInsumo;
  aplicaciones: number;
  costo: number;
  /** Fracción del costo total, entre 0 y 1. */
  fraccion: number;
};

export type ResumenOrdenes = {
  ordenes: number;
  aplicaciones: number;
  costoTotal: number;
  hectareasCubiertas: number;
  parcelasConOrden: number;
  porParcela: CostoPorParcela[];
  porCategoria: CostoPorCategoria[];
};

export async function getOrdenes(): Promise<OrdenDTO[]> {
  const ordenes = await prisma.workOrder.findMany({
    orderBy: [{ fechaTarea: "desc" }],
    include: {
      lineas: {
        include: { insumo: true, parcela: true },
      },
    },
  });

  return ordenes.map((orden) => {
    // La parcela vive en las líneas, no en la cabecera. En la práctica una orden
    // es una aplicación sobre una parcela: se toma la de la primera línea.
    const primera = orden.lineas[0];
    const parcela = primera
      ? {
          codigo: primera.parcela.codigo,
          variedad: primera.parcela.variedad,
          superficieHa: primera.parcela.superficieHa,
        }
      : null;

    const lineas: LineaDTO[] = orden.lineas.map((linea) => {
      const totalUso = linea.dosisHa * linea.parcela.superficieHa;
      return {
        id: linea.id,
        marca: linea.insumo.marca,
        principioActivo: linea.insumo.principioActivo,
        categoria: linea.insumo.categoria,
        dosisHa: linea.dosisHa,
        unidad: linea.insumo.unidad,
        totalUso,
        costoUsd: totalUso * linea.insumo.precioUsd,
      };
    });

    return {
      id: orden.id,
      numero: orden.numero,
      fechaEmision: orden.fechaEmision.toISOString(),
      fechaTarea: orden.fechaTarea.toISOString(),
      aplicador: orden.aplicador,
      herramienta: orden.herramienta,
      estado: orden.estado,
      observaciones: orden.observaciones,
      parcela,
      lineas,
      costoTotal: lineas.reduce((s, l) => s + l.costoUsd, 0),
    };
  });
}

export async function getResumenOrdenes(): Promise<ResumenOrdenes> {
  const lineas = await prisma.workOrderLinea.findMany({
    include: { insumo: true, parcela: true },
  });

  const porParcelaMap = new Map<
    string,
    {
      codigo: string;
      variedad: string;
      superficieHa: number;
      ordenes: Set<string>;
      costo: number;
    }
  >();
  const porCategoriaMap = new Map<
    CategoriaInsumo,
    { aplicaciones: number; costo: number }
  >();

  let costoTotal = 0;

  for (const linea of lineas) {
    const costo =
      linea.dosisHa * linea.parcela.superficieHa * linea.insumo.precioUsd;
    costoTotal += costo;

    const p = porParcelaMap.get(linea.parcelaId) ?? {
      codigo: linea.parcela.codigo,
      variedad: linea.parcela.variedad,
      superficieHa: linea.parcela.superficieHa,
      ordenes: new Set<string>(),
      costo: 0,
    };
    p.ordenes.add(linea.workOrderId);
    p.costo += costo;
    porParcelaMap.set(linea.parcelaId, p);

    const c = porCategoriaMap.get(linea.insumo.categoria) ?? {
      aplicaciones: 0,
      costo: 0,
    };
    c.aplicaciones += 1;
    c.costo += costo;
    porCategoriaMap.set(linea.insumo.categoria, c);
  }

  const porParcela: CostoPorParcela[] = [...porParcelaMap.values()]
    .map((p) => ({
      codigo: p.codigo,
      variedad: p.variedad,
      superficieHa: p.superficieHa,
      ordenes: p.ordenes.size,
      costo: p.costo,
      costoHa: p.superficieHa > 0 ? p.costo / p.superficieHa : 0,
    }))
    .sort((a, b) => b.costoHa - a.costoHa);

  const porCategoria: CostoPorCategoria[] = [...porCategoriaMap.entries()]
    .map(([categoria, v]) => ({
      categoria,
      aplicaciones: v.aplicaciones,
      costo: v.costo,
      fraccion: costoTotal > 0 ? v.costo / costoTotal : 0,
    }))
    .sort((a, b) => b.costo - a.costo);

  const ordenesDistintas = new Set(lineas.map((l) => l.workOrderId));

  return {
    ordenes: ordenesDistintas.size,
    aplicaciones: lineas.length,
    costoTotal,
    hectareasCubiertas: porParcela.reduce((s, p) => s + p.superficieHa, 0),
    parcelasConOrden: porParcela.length,
    porParcela,
    porCategoria,
  };
}

