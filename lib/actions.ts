"use server";

// FIRMAS CONGELADAS: el agente de frontend depende de estas funciones y tipos.
// El agente de backend implementa el cuerpo usando `prisma` (@/lib/prisma).
// No cambiar nombres, parámetros ni tipos de retorno sin coordinar.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calcularStock, calcularStockMap, claveStock } from "@/lib/stock";
import type {
  StockPorUbicacion,
  LocationDTO,
  MovementInput,
  RegistrarResult,
  MovimientoDTO,
  Discrepancia,
} from "@/lib/types";
import type { MovementType } from "@/app/generated/prisma/enums";

const TIPOS_INGRESO: ReadonlySet<MovementType> = new Set([
  "INGRESO_TOLVAS",
  "INGRESO_TREVELIN",
  "CAMPO_A_FRIO",
]);

function toLocationDTO(loc: {
  id: string;
  nombre: string;
  tipo: LocationDTO["tipo"];
  esPropia: boolean;
}): LocationDTO {
  return {
    id: loc.id,
    nombre: loc.nombre,
    tipo: loc.tipo,
    esPropia: loc.esPropia,
  };
}

export async function getLocations(): Promise<LocationDTO[]> {
  const locations = await prisma.location.findMany({
    select: { id: true, nombre: true, tipo: true, esPropia: true },
    orderBy: { nombre: "asc" },
  });
  return locations.map(toLocationDTO);
}

export async function getStock(): Promise<StockPorUbicacion[]> {
  const [locations, filas] = await Promise.all([
    prisma.location.findMany({
      where: { esPropia: true },
      select: { id: true, nombre: true, tipo: true, esPropia: true },
      orderBy: { nombre: "asc" },
    }),
    calcularStock(),
  ]);

  const rowsByLoc = new Map<string, StockPorUbicacion["rows"]>();
  for (const loc of locations) {
    rowsByLoc.set(loc.id, []);
  }
  for (const fila of filas) {
    const rows = rowsByLoc.get(fila.locId);
    if (!rows) continue;
    rows.push({
      variedad: fila.variedad,
      lote: fila.lote,
      kg: fila.kg,
      bolsas: fila.bolsas,
    });
  }

  return locations.map((loc) => {
    const rows = (rowsByLoc.get(loc.id) ?? []).sort(
      (a, b) =>
        a.variedad.localeCompare(b.variedad, "es") ||
        a.lote.localeCompare(b.lote, "es", { numeric: true }),
    );
    let totalKg = 0;
    let totalBolsas = 0;
    for (const row of rows) {
      totalKg += row.kg;
      totalBolsas += row.bolsas;
    }
    return {
      location: toLocationDTO(loc),
      totalKg,
      totalBolsas,
      rows,
    };
  });
}

export async function getMovimientos(limit = 50): Promise<MovimientoDTO[]> {
  const movements = await prisma.movement.findMany({
    take: limit,
    orderBy: { fecha: "desc" },
    select: {
      id: true,
      remito: true,
      fecha: true,
      tipo: true,
      transporte: true,
      cliente: true,
      origen: { select: { nombre: true } },
      destino: { select: { nombre: true } },
      items: {
        select: {
          variedad: true,
          lote: true,
          kg: true,
          bolsas: true,
          categoria: true,
        },
      },
    },
  });

  return movements.map((m) => ({
    id: m.id,
    remito: m.remito,
    fecha: m.fecha.toISOString(),
    tipo: m.tipo,
    origen: m.origen.nombre,
    destino: m.destino.nombre,
    transporte: m.transporte,
    cliente: m.cliente,
    items: m.items.map((item) => ({
      variedad: item.variedad,
      lote: item.lote,
      kg: item.kg,
      bolsas: item.bolsas,
      categoria: item.categoria,
    })),
  }));
}

export async function registrarMovimiento(
  input: MovementInput,
): Promise<RegistrarResult> {
  if (!input.origenId || !input.destinoId) {
    return { ok: false, error: "Origen y destino son obligatorios" };
  }
  if (!input.items.length) {
    return { ok: false, error: "El movimiento no tiene líneas" };
  }

  const locationIds = [...new Set([input.origenId, input.destinoId])];
  const locations = await prisma.location.findMany({
    where: { id: { in: locationIds } },
    select: { id: true, nombre: true },
  });
  if (locations.length !== locationIds.length) {
    return { ok: false, error: "Origen o destino inexistente" };
  }
  const nombreOrigen =
    locations.find((l) => l.id === input.origenId)?.nombre ?? input.origenId;

  if (!TIPOS_INGRESO.has(input.tipo)) {
    const stockMap = await calcularStockMap();
    const disponible = new Map<string, number>();
    for (const [key, fila] of stockMap) {
      disponible.set(key, fila.kg);
    }

    for (const item of input.items) {
      const key = claveStock(input.origenId, item.variedad, item.lote);
      const hay = disponible.get(key) ?? 0;
      if (hay < item.kg) {
        return {
          ok: false,
          error: `Stock insuficiente de ${item.variedad} lote ${item.lote} en ${nombreOrigen}: disponible ${hay} kg, pedís ${item.kg} kg`,
        };
      }
      disponible.set(key, hay - item.kg);
    }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      return tx.movement.create({
        data: {
          tipo: input.tipo,
          fecha: input.fecha ? new Date(input.fecha) : new Date(),
          remito: input.remito ?? null,
          origenId: input.origenId,
          destinoId: input.destinoId,
          transporte: input.transporte ?? null,
          cliente: input.cliente ?? null,
          comisionista: input.comisionista ?? null,
          observaciones: input.observaciones ?? null,
          rawInput: input.rawInput ?? null,
          parseadoPorIa: input.parseadoPorIa ?? false,
          items: {
            create: input.items.map((item) => ({
              variedad: item.variedad,
              lote: item.lote,
              categoria: item.categoria ?? null,
              unidad: item.unidad,
              bolsas: item.bolsas ?? null,
              kg: item.kg,
              kgPromedio: item.kgPromedio ?? null,
            })),
          },
        },
        select: { id: true },
      });
    });

    revalidatePath("/");
    return { ok: true, movementId: created.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo registrar el movimiento";
    return { ok: false, error: message };
  }
}

export async function detectarDiscrepancias(): Promise<Discrepancia[]> {
  const [stockMap, conteos] = await Promise.all([
    calcularStockMap(),
    prisma.stockCount.findMany({
      select: {
        fecha: true,
        variedad: true,
        lote: true,
        kgContado: true,
        locationId: true,
        location: { select: { id: true, nombre: true, esPropia: true } },
      },
    }),
  ]);

  // Un solo pase: quedarse con el conteo más reciente por (locationId, variedad, lote).
  const ultimoConteo = new Map<string, (typeof conteos)[number]>();
  for (const conteo of conteos) {
    const key = claveStock(conteo.locationId, conteo.variedad, conteo.lote);
    const prev = ultimoConteo.get(key);
    if (!prev || conteo.fecha > prev.fecha) {
      ultimoConteo.set(key, conteo);
    }
  }

  const discrepancias: Discrepancia[] = [];

  for (const [key, conteo] of ultimoConteo) {
    if (!conteo.location.esPropia) continue;
    const esperadoKg = stockMap.get(key)?.kg ?? 0;
    const contadoKg = conteo.kgContado;
    const diffKg = contadoKg - esperadoKg;
    if (Math.abs(diffKg) <= 0.5) continue;
    discrepancias.push({
      locationId: conteo.locationId,
      locationNombre: conteo.location.nombre,
      variedad: conteo.variedad,
      lote: conteo.lote,
      esperadoKg,
      contadoKg,
      diffKg,
      hipotesis: null,
    });
  }

  discrepancias.sort(
    (a, b) =>
      a.locationNombre.localeCompare(b.locationNombre, "es") ||
      a.variedad.localeCompare(b.variedad, "es") ||
      a.lote.localeCompare(b.lote, "es", { numeric: true }),
  );
  return discrepancias;
}
