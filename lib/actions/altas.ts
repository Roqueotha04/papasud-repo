"use server";

// Server actions de ALTA (formularios de carga): Parcela, Muestreo pre-cosecha
// y Conteo físico de stock. Self-contenido a propósito: no depende de otras
// actions en desarrollo paralelo (lib/actions/parcelas.ts, muestreos.ts,
// stock.ts, indicadores.ts). Sólo usa @/lib/prisma (estable).
//
// Un archivo "use server" sólo puede exportar funciones async: los tipos se
// exportan con `export type` (se borran en compilación, no rompen la regla).

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import type {
  CategoriaInsumo,
  EstadoOrden,
  Herramienta,
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type AltaResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type CampaniaSelect = { id: string; nombre: string };
export type ParcelaSelect = {
  id: string;
  codigo: string;
  variedad: string;
  superficieHa: number;
};
export type UbicacionSelect = { id: string; nombre: string };

export type CrearParcelaInput = {
  codigo: string;
  variedad: string;
  superficieHa: number;
  campaniaId: string;
  pivote?: string | null;
  tercio?: number | null;
};

export type CrearMuestreoCalibreInput = {
  rango: string;
  pesoKg: number;
  cantidad: number;
};

export type CrearMuestreoInput = {
  parcelaId: string;
  fecha: string; // ISO
  tratamiento?: string | null;
  pesoTotalKg: number;
  nTuberculos: number;
  tallos?: number | null;
  tallosPorMetro?: number | null;
  calibres: CrearMuestreoCalibreInput[];
};

export type CrearConteoInput = {
  locationId: string;
  variedad: string;
  lote: string;
  kgContado: number;
  fecha: string; // ISO
};

export type InsumoSelect = {
  id: string;
  marca: string;
  principioActivo: string;
  categoria: CategoriaInsumo;
  precioUsd: number;
  dosisHaRecomendada: number;
  unidad: string;
};

export type CrearOrdenLineaInput = {
  insumoId: string;
  dosisHa: number;
};

export type CrearOrdenInput = {
  parcelaId: string;
  fechaEmision: string; // ISO
  fechaTarea: string; // ISO
  aplicador: string;
  herramienta: Herramienta;
  estado: EstadoOrden;
  observaciones?: string | null;
  lineas: CrearOrdenLineaInput[];
};

// ---------- Selects para los formularios ----------

export async function getCampanias(): Promise<CampaniaSelect[]> {
  const campanias = await prisma.campania.findMany({
    select: { id: true, nombre: true },
    orderBy: { nombre: "desc" },
  });
  return campanias;
}

export async function getParcelasSelect(): Promise<ParcelaSelect[]> {
  const parcelas = await prisma.parcela.findMany({
    select: { id: true, codigo: true, variedad: true, superficieHa: true },
    orderBy: [{ codigo: "asc" }],
  });
  return parcelas;
}

export async function getUbicacionesPropias(): Promise<UbicacionSelect[]> {
  const ubicaciones = await prisma.location.findMany({
    where: { esPropia: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return ubicaciones;
}

export async function getInsumosSelect(): Promise<InsumoSelect[]> {
  const insumos = await prisma.insumo.findMany({
    select: {
      id: true,
      marca: true,
      principioActivo: true,
      categoria: true,
      precioUsd: true,
      dosisHaRecomendada: true,
      unidad: true,
    },
    orderBy: [{ categoria: "asc" }, { marca: "asc" }],
  });
  return insumos;
}

// ---------- Altas ----------

export async function crearParcela(input: CrearParcelaInput): Promise<AltaResult> {
  const codigo = input.codigo.trim();
  const variedad = input.variedad.trim();

  if (!codigo) return { ok: false, error: "El código de parcela no puede estar vacío." };
  if (!Number.isFinite(input.superficieHa) || input.superficieHa <= 0) {
    return { ok: false, error: "La superficie tiene que ser mayor a cero." };
  }
  if (!variedad) return { ok: false, error: "La variedad no puede estar vacía." };
  if (!input.campaniaId) return { ok: false, error: "Elegí una campaña." };

  let tercio: number | null = null;
  if (input.tercio !== undefined && input.tercio !== null) {
    if (!Number.isInteger(input.tercio) || input.tercio < 1 || input.tercio > 3) {
      return { ok: false, error: "El tercio tiene que ser 1, 2 o 3." };
    }
    tercio = input.tercio;
  }

  const campania = await prisma.campania.findUnique({
    where: { id: input.campaniaId },
    select: { id: true, nombre: true },
  });
  if (!campania) return { ok: false, error: "La campaña elegida no existe." };

  // El try envuelve solo la escritura. Si revalidatePath quedara adentro, un
  // fallo suyo se reportaría como "no se pudo guardar" con la fila ya escrita:
  // el sistema estaría mintiendo sobre un dato.
  let parcelaId: string;
  try {
    const parcela = await prisma.parcela.create({
      data: {
        codigo,
        variedad,
        superficieHa: input.superficieHa,
        campaniaId: campania.id,
        pivote: input.pivote?.trim() || null,
        tercio,
      },
      select: { id: true },
    });
    parcelaId = parcela.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: `Ya existe una parcela con el código ${codigo} en la campaña ${campania.nombre}.`,
      };
    }
    return { ok: false, error: "No se pudo guardar la parcela. Intentá de nuevo." };
  }

  revalidatePath("/parcelas");
  revalidatePath("/indicadores");
  return { ok: true, id: parcelaId };
}

export async function crearMuestreo(input: CrearMuestreoInput): Promise<AltaResult> {
  if (!input.parcelaId) return { ok: false, error: "Elegí una parcela." };

  const parcela = await prisma.parcela.findUnique({
    where: { id: input.parcelaId },
    select: { id: true },
  });
  if (!parcela) return { ok: false, error: "La parcela elegida no existe." };

  if (!Number.isFinite(input.pesoTotalKg) || input.pesoTotalKg <= 0) {
    return { ok: false, error: "El peso total de la muestra tiene que ser mayor a cero." };
  }
  if (!Number.isInteger(input.nTuberculos) || input.nTuberculos <= 0) {
    return {
      ok: false,
      error: "La cantidad de tubérculos tiene que ser un entero mayor a cero.",
    };
  }
  if (input.tallos !== undefined && input.tallos !== null) {
    if (!Number.isInteger(input.tallos) || input.tallos < 0) {
      return { ok: false, error: "Los tallos tienen que ser un entero mayor o igual a 0." };
    }
  }
  if (input.tallosPorMetro !== undefined && input.tallosPorMetro !== null) {
    if (!Number.isFinite(input.tallosPorMetro) || input.tallosPorMetro < 0) {
      return { ok: false, error: "Los tallos por metro tienen que ser mayor o igual a 0." };
    }
  }

  if (!input.calibres || input.calibres.length === 0) {
    return { ok: false, error: "Agregá al menos una línea de calibre." };
  }

  const fecha = new Date(input.fecha);
  if (Number.isNaN(fecha.getTime())) {
    return { ok: false, error: "La fecha del muestreo no es válida." };
  }

  for (let i = 0; i < input.calibres.length; i++) {
    const c = input.calibres[i]!;
    const n = i + 1;
    if (!c.rango || !c.rango.trim()) {
      return { ok: false, error: `Línea de calibre ${n}: falta el rango.` };
    }
    if (!Number.isFinite(c.pesoKg) || c.pesoKg < 0) {
      return { ok: false, error: `Línea de calibre ${n}: el peso tiene que ser mayor o igual a 0.` };
    }
    if (!Number.isInteger(c.cantidad) || c.cantidad < 0) {
      return {
        ok: false,
        error: `Línea de calibre ${n}: la cantidad tiene que ser un entero mayor o igual a 0.`,
      };
    }
  }

  let muestreoId: string;
  try {
    const muestreo = await prisma.$transaction(async (tx) => {
      return tx.muestreo.create({
        data: {
          parcelaId: parcela.id,
          fecha,
          tratamiento: input.tratamiento?.trim() || null,
          pesoTotalKg: input.pesoTotalKg,
          nTuberculos: input.nTuberculos,
          tallos: input.tallos ?? null,
          tallosPorMetro: input.tallosPorMetro ?? null,
          calibres: {
            create: input.calibres.map((c, idx) => ({
              rango: c.rango.trim(),
              ordenRango: idx,
              pesoKg: c.pesoKg,
              cantidad: c.cantidad,
            })),
          },
        },
        select: { id: true },
      });
    });
    muestreoId = muestreo.id;
  } catch {
    return { ok: false, error: "No se pudo guardar el muestreo. Intentá de nuevo." };
  }

  revalidatePath("/muestreos");
  revalidatePath("/indicadores");
  return { ok: true, id: muestreoId };
}

export async function crearConteo(input: CrearConteoInput): Promise<AltaResult> {
  if (!input.locationId) return { ok: false, error: "Elegí una ubicación." };

  const location = await prisma.location.findUnique({
    where: { id: input.locationId },
    select: { id: true },
  });
  if (!location) return { ok: false, error: "La ubicación elegida no existe." };

  const variedad = input.variedad.trim();
  const lote = input.lote.trim();
  if (!variedad) return { ok: false, error: "La variedad no puede estar vacía." };
  if (!lote) return { ok: false, error: "El lote no puede estar vacío." };
  if (!Number.isFinite(input.kgContado) || input.kgContado < 0) {
    return { ok: false, error: "Los kilos contados tienen que ser mayor o igual a 0." };
  }

  let fecha = new Date();
  if (input.fecha) {
    const parsed = new Date(input.fecha);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "La fecha del conteo no es válida." };
    }
    fecha = parsed;
  }

  let conteoId: string;
  try {
    const conteo = await prisma.stockCount.create({
      data: {
        locationId: location.id,
        variedad,
        lote,
        kgContado: input.kgContado,
        fecha,
      },
      select: { id: true },
    });
    conteoId = conteo.id;
  } catch {
    return { ok: false, error: "No se pudo guardar el conteo. Intentá de nuevo." };
  }

  revalidatePath("/");
  revalidatePath("/indicadores");
  return { ok: true, id: conteoId };
}

export async function crearOrdenTrabajo(
  input: CrearOrdenInput,
): Promise<AltaResult> {
  if (!input.parcelaId) return { ok: false, error: "Elegí la parcela." };

  const parcela = await prisma.parcela.findUnique({
    where: { id: input.parcelaId },
    select: { id: true },
  });
  if (!parcela) return { ok: false, error: "La parcela elegida no existe." };

  const aplicador = input.aplicador.trim();
  if (!aplicador) return { ok: false, error: "Ingresá quién aplica." };

  const fechaEmision = new Date(input.fechaEmision);
  if (Number.isNaN(fechaEmision.getTime())) {
    return { ok: false, error: "La fecha de emisión no es válida." };
  }
  const fechaTarea = new Date(input.fechaTarea);
  if (Number.isNaN(fechaTarea.getTime())) {
    return { ok: false, error: "La fecha de tarea no es válida." };
  }

  if (!input.lineas || input.lineas.length === 0) {
    return { ok: false, error: "Agregá al menos una línea de insumo." };
  }

  for (let i = 0; i < input.lineas.length; i++) {
    const l = input.lineas[i]!;
    const n = i + 1;
    if (!l.insumoId) {
      return { ok: false, error: `Línea ${n}: elegí el insumo.` };
    }
    if (!Number.isFinite(l.dosisHa) || l.dosisHa <= 0) {
      return { ok: false, error: `Línea ${n}: la dosis tiene que ser mayor a 0.` };
    }
  }

  // Una sola query para validar todos los insumos, no una por línea.
  const ids = [...new Set(input.lineas.map((l) => l.insumoId))];
  const insumos = await prisma.insumo.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (insumos.length !== ids.length) {
    return { ok: false, error: "Alguno de los insumos elegidos ya no existe." };
  }

  let ordenId: string;
  try {
    const orden = await prisma.$transaction(async (tx) => {
      // El número sigue la numeración del papel. Se calcula acá adentro para que
      // dos altas simultáneas no se lleven el mismo.
      const ultima = await tx.workOrder.findFirst({
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const numero = (ultima?.numero ?? 0) + 1;

      return tx.workOrder.create({
        data: {
          numero,
          fechaEmision,
          fechaTarea,
          aplicador,
          herramienta: input.herramienta,
          estado: input.estado,
          observaciones: input.observaciones?.trim() || null,
          lineas: {
            create: input.lineas.map((l) => ({
              insumoId: l.insumoId,
              parcelaId: parcela.id,
              dosisHa: l.dosisHa,
            })),
          },
        },
        select: { id: true },
      });
    });
    ordenId = orden.id;
  } catch {
    return { ok: false, error: "No se pudo guardar la orden. Intentá de nuevo." };
  }

  revalidatePath("/ordenes");
  return { ok: true, id: ordenId };
}
