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

    revalidatePath("/parcelas");
    revalidatePath("/indicadores");
    return { ok: true, id: parcela.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: `Ya existe una parcela con el código ${codigo} en la campaña ${campania.nombre}.`,
      };
    }
    return { ok: false, error: "No se pudo guardar la parcela. Intentá de nuevo." };
  }
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

    revalidatePath("/muestreos");
    revalidatePath("/indicadores");
    return { ok: true, id: muestreo.id };
  } catch {
    return { ok: false, error: "No se pudo guardar el muestreo. Intentá de nuevo." };
  }
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

    revalidatePath("/");
    revalidatePath("/indicadores");
    return { ok: true, id: conteo.id };
  } catch {
    return { ok: false, error: "No se pudo guardar el conteo. Intentá de nuevo." };
  }
}
