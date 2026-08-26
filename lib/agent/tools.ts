// Herramientas del asistente.
//
// El asistente ya no recibe una foto del stock pegada en el prompt: pregunta.
// Cada herramienta es una lectura acotada sobre los mismos módulos derivados
// que usan las páginas (lib/stock, lib/indicadores, lib/trazabilidad,
// lib/ordenes, lib/proyeccion), así que el número que da el modelo es
// exactamente el que muestra la pantalla. Ninguna herramienta escribe: el
// asistente consulta, no opera.
//
// Todas devuelven objetos chicos y ya redondeados. Los límites de filas no son
// decorativos: son lo que evita que una pregunta amplia se coma la ventana de
// contexto.

import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/prisma";
import { calcularStock } from "@/lib/stock";
import { calcularIndicadores } from "@/lib/indicadores";
import { getResumenOrdenes, getOrdenes } from "@/lib/ordenes";
import { getMuestreos } from "@/lib/actions/muestreos";
import { detectarDiscrepancias } from "@/lib/actions/stock";
import { TIPOS_INGRESO } from "@/lib/trazabilidad";
import { MOVEMENT_TYPE_LABELS } from "@/app/components/format";
import type { MovementType } from "@/app/generated/prisma/enums";

const MAX_FILAS = 60;
const MAX_MOVIMIENTOS = 40;

function redondear(n: number, decimales = 0): number {
  const factor = 10 ** decimales;
  return Math.round(n * factor) / factor;
}

function iso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Recorta una lista y avisa cuántas filas quedaron afuera, para que el modelo
 *  sepa que está viendo una parte y pueda pedir un filtro más angosto. */
function acotar<T>(filas: T[], max: number): { filas: T[]; nota?: string } {
  if (filas.length <= max) return { filas };
  return {
    filas: filas.slice(0, max),
    nota: `Se muestran ${max} de ${filas.length} filas. Pedí un filtro más específico para ver el resto.`,
  };
}

function coincide(valor: string | null | undefined, filtro?: string): boolean {
  if (!filtro) return true;
  if (!valor) return false;
  return valor.toLowerCase().includes(filtro.trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// Definiciones que ve el modelo
// ---------------------------------------------------------------------------

export const HERRAMIENTAS: Tool[] = [
  {
    name: "consultar_stock",
    description:
      "Stock disponible hoy en las ubicaciones propias, derivado de todos los movimientos registrados. Devuelve una fila por ubicación, variedad y lote, más los totales. Usala para 'cuánto hay', 'qué hay en tal depósito', 'cuánto queda de tal variedad'.",
    input_schema: {
      type: "object",
      properties: {
        ubicacion: {
          type: "string",
          description: "Nombre o parte del nombre de la ubicación. Ej: 'Santa Ana', 'Dospanca'.",
        },
        variedad: { type: "string", description: "Variedad de papa. Ej: 'spunta'." },
        lote: { type: "string", description: "Número de lote exacto. Ej: '235'." },
      },
    },
  },
  {
    name: "consultar_movimientos",
    description:
      "Remitos registrados, del más reciente al más antiguo, con sus líneas. Usala para 'qué se movió', 'qué salió para tal cliente', 'movimientos de tal día', 'quién transportó'.",
    input_schema: {
      type: "object",
      properties: {
        desde: { type: "string", description: "Fecha mínima, formato AAAA-MM-DD." },
        hasta: { type: "string", description: "Fecha máxima inclusive, formato AAAA-MM-DD." },
        tipo: {
          type: "string",
          enum: Object.keys(MOVEMENT_TYPE_LABELS),
          description: "Tipo de movimiento.",
        },
        variedad: { type: "string" },
        lote: { type: "string" },
        ubicacion: {
          type: "string",
          description: "Filtra por origen o destino, por nombre parcial.",
        },
        cliente: { type: "string" },
        limite: {
          type: "number",
          description: `Cuántos remitos traer. Máximo ${MAX_MOVIMIENTOS}, por defecto 20.`,
        },
      },
    },
  },
  {
    name: "trazar_lote",
    description:
      "Historia completa de una partida (variedad + lote): de qué parcela salió, por dónde pasó, cómo se clasificó comercialmente y dónde está el saldo hoy. Usala para 'dónde está el lote X', 'de dónde viene', 'a quién se le vendió'.",
    input_schema: {
      type: "object",
      properties: {
        variedad: { type: "string", description: "Variedad de la partida." },
        lote: { type: "string", description: "Número de lote." },
      },
      required: ["lote"],
    },
  },
  {
    name: "consultar_parcelas",
    description:
      "Parcelas de campo con superficie, variedad, campaña y su producción cosechada. Usala para 'qué parcelas hay', 'cuántas hectáreas de tal variedad', 'cuánto produjo tal parcela'.",
    input_schema: {
      type: "object",
      properties: {
        codigo: { type: "string", description: "Código de parcela. Ej: '37A'." },
        variedad: { type: "string" },
        campania: { type: "string", description: "Nombre de campaña. Ej: '2026'." },
      },
    },
  },
  {
    name: "consultar_indicadores",
    description:
      "Producción, rendimiento en kg/ha y porcentaje de exportación, agregados por parcela, por variedad y en total. Usala para 'cuánto rindió', 'qué variedad anduvo mejor', 'cuánto exportamos'.",
    input_schema: {
      type: "object",
      properties: {
        campania: { type: "string" },
        variedad: { type: "string" },
        detalle: {
          type: "boolean",
          description: "Si es true incluye el desglose por parcela. Por defecto solo totales y variedades.",
        },
      },
    },
  },
  {
    name: "consultar_muestreos",
    description:
      "Muestreos pre-cosecha con su proyección comercial y el contraste contra la cosecha real. Usala para 'qué proyecta tal parcela', 'le acertó el muestreo', 'cómo dio el ensayo de Rootex'.",
    input_schema: {
      type: "object",
      properties: {
        parcela: { type: "string", description: "Código de parcela." },
        variedad: { type: "string" },
        calibres: {
          type: "boolean",
          description: "Si es true incluye la distribución por calibre de cada muestreo.",
        },
      },
    },
  },
  {
    name: "consultar_ordenes",
    description:
      "Órdenes de trabajo: aplicaciones de insumos por parcela, con dosis, aplicador, herramienta, estado y costo derivado en dólares. Usala para 'qué se aplicó', 'cuánto costó', 'qué órdenes quedan pendientes'.",
    input_schema: {
      type: "object",
      properties: {
        parcela: { type: "string", description: "Código de parcela." },
        estado: { type: "string", enum: ["BORRADOR", "EMITIDA", "EJECUTADA"] },
        variedad: { type: "string" },
        campania: { type: "string" },
        resumen: {
          type: "boolean",
          description: "Si es true devuelve solo el resumen de costos por parcela y categoría, sin el detalle de cada orden.",
        },
      },
    },
  },
  {
    name: "consultar_discrepancias",
    description:
      "Diferencias entre el stock derivado de los movimientos y el último conteo físico de cada lote. Usala para 'hay faltantes', 'qué no cierra', 'cuánto falta en tal depósito'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "consultar_catalogos",
    description:
      "Datos de referencia del sistema: ubicaciones, campañas, variedades sembradas, clientes con los que se operó y catálogo de insumos con precios. Usala cuando necesites saber qué valores existen antes de filtrar por ellos.",
    input_schema: {
      type: "object",
      properties: {
        que: {
          type: "string",
          enum: ["ubicaciones", "campanias", "variedades", "clientes", "insumos", "todo"],
          description: "Qué catálogo traer. Por defecto 'todo'.",
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

type Args = Record<string, unknown>;

function str(args: Args, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function bool(args: Args, key: string): boolean {
  return args[key] === true;
}

async function stock(args: Args) {
  const [locations, filas] = await Promise.all([
    prisma.location.findMany({
      select: { id: true, nombre: true, tipo: true, esPropia: true },
    }),
    calcularStock(),
  ]);
  const porId = new Map(locations.map((l) => [l.id, l]));

  const filtradas = filas
    .map((f) => ({ fila: f, loc: porId.get(f.locId) }))
    .filter(
      ({ fila, loc }) =>
        loc?.esPropia &&
        coincide(loc.nombre, str(args, "ubicacion")) &&
        coincide(fila.variedad, str(args, "variedad")) &&
        (!str(args, "lote") || fila.lote === str(args, "lote")),
    )
    .map(({ fila, loc }) => ({
      ubicacion: loc!.nombre,
      variedad: fila.variedad,
      lote: fila.lote,
      kg: redondear(fila.kg),
      bolsas: fila.bolsas,
    }))
    .sort((a, b) => b.kg - a.kg);

  const { filas: mostradas, nota } = acotar(filtradas, MAX_FILAS);
  return {
    totalKg: redondear(filtradas.reduce((s, f) => s + f.kg, 0)),
    totalBolsas: filtradas.reduce((s, f) => s + f.bolsas, 0),
    lotes: filtradas.length,
    filas: mostradas,
    nota,
  };
}

async function movimientos(args: Args) {
  const desde = str(args, "desde");
  const hasta = str(args, "hasta");
  const pedido = typeof args.limite === "number" ? args.limite : 20;
  const limite = Math.min(Math.max(1, pedido), MAX_MOVIMIENTOS);
  const ubicacion = str(args, "ubicacion");

  const movs = await prisma.movement.findMany({
    where: {
      ...(desde || hasta
        ? {
            fecha: {
              ...(desde ? { gte: new Date(`${desde}T00:00:00Z`) } : {}),
              // El "hasta" es inclusive: se corre al final del día.
              ...(hasta ? { lte: new Date(`${hasta}T23:59:59Z`) } : {}),
            },
          }
        : {}),
      ...(str(args, "tipo") ? { tipo: str(args, "tipo") as MovementType } : {}),
      ...(str(args, "cliente")
        ? { cliente: { contains: str(args, "cliente")!, mode: "insensitive" as const } }
        : {}),
      ...(ubicacion
        ? {
            OR: [
              { origen: { nombre: { contains: ubicacion, mode: "insensitive" as const } } },
              { destino: { nombre: { contains: ubicacion, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(str(args, "variedad") || str(args, "lote")
        ? {
            items: {
              some: {
                ...(str(args, "variedad")
                  ? { variedad: { contains: str(args, "variedad")!, mode: "insensitive" as const } }
                  : {}),
                ...(str(args, "lote") ? { lote: str(args, "lote") } : {}),
              },
            },
          }
        : {}),
    },
    orderBy: { fecha: "desc" },
    take: limite,
    select: {
      remito: true,
      fecha: true,
      tipo: true,
      transporte: true,
      cliente: true,
      observaciones: true,
      origen: { select: { nombre: true } },
      destino: { select: { nombre: true } },
      parcela: { select: { codigo: true } },
      items: {
        select: { variedad: true, lote: true, kg: true, bolsas: true, categoria: true },
      },
    },
  });

  return {
    remitos: movs.length,
    limite,
    movimientos: movs.map((m) => ({
      remito: m.remito,
      fecha: iso(m.fecha),
      tipo: MOVEMENT_TYPE_LABELS[m.tipo] ?? m.tipo,
      origen: m.origen.nombre,
      destino: m.destino.nombre,
      transporte: m.transporte,
      cliente: m.cliente,
      parcela: m.parcela?.codigo ?? null,
      observaciones: m.observaciones,
      kgTotal: redondear(m.items.reduce((s, i) => s + i.kg, 0)),
      items: m.items.map((i) => ({
        variedad: i.variedad,
        lote: i.lote,
        kg: redondear(i.kg),
        bolsas: i.bolsas,
        categoria: i.categoria,
      })),
    })),
  };
}

async function trazar(args: Args) {
  const lote = str(args, "lote");
  if (!lote) return { error: "Falta el número de lote." };
  const variedad = str(args, "variedad");

  const items = await prisma.movementItem.findMany({
    where: {
      lote,
      ...(variedad ? { variedad: { contains: variedad, mode: "insensitive" as const } } : {}),
    },
    select: {
      variedad: true,
      lote: true,
      kg: true,
      bolsas: true,
      categoria: true,
      movement: {
        select: {
          remito: true,
          fecha: true,
          tipo: true,
          cliente: true,
          transporte: true,
          origen: { select: { nombre: true } },
          destino: { select: { nombre: true, esPropia: true } },
          parcela: { select: { codigo: true, variedad: true, superficieHa: true } },
        },
      },
    },
    orderBy: { movement: { fecha: "asc" } },
  });

  if (items.length === 0) {
    return {
      encontrado: false,
      mensaje: `No hay ningún movimiento con el lote ${lote}${variedad ? ` de ${variedad}` : ""}.`,
    };
  }

  // El saldo por ubicación se recalcula acá y no se lee de calcularStock()
  // porque hay que incluir también las ubicaciones no propias: parte de la
  // pregunta "dónde está el lote" se responde con "ya se entregó a tal
  // cliente".
  const saldo = new Map<string, number>();
  for (const it of items) {
    const { origen, destino } = it.movement;
    saldo.set(origen.nombre, (saldo.get(origen.nombre) ?? 0) - it.kg);
    saldo.set(destino.nombre, (saldo.get(destino.nombre) ?? 0) + it.kg);
  }

  const porCategoria = new Map<string, number>();
  for (const it of items) {
    if (!it.categoria) continue;
    if ((TIPOS_INGRESO as readonly string[]).includes(it.movement.tipo)) continue;
    porCategoria.set(it.categoria, (porCategoria.get(it.categoria) ?? 0) + it.kg);
  }

  const parcelas = [
    ...new Set(items.map((i) => i.movement.parcela?.codigo).filter(Boolean)),
  ];

  const { filas: historia, nota } = acotar(
    items.map((it) => ({
      fecha: iso(it.movement.fecha),
      remito: it.movement.remito,
      tipo: MOVEMENT_TYPE_LABELS[it.movement.tipo] ?? it.movement.tipo,
      variedad: it.variedad,
      origen: it.movement.origen.nombre,
      destino: it.movement.destino.nombre,
      kg: redondear(it.kg),
      categoria: it.categoria,
      cliente: it.movement.cliente,
    })),
    MAX_FILAS,
  );

  return {
    encontrado: true,
    lote,
    variedades: [...new Set(items.map((i) => i.variedad))],
    parcelasDeOrigen: parcelas,
    movimientos: items.length,
    saldoPorUbicacion: [...saldo.entries()]
      .filter(([, kg]) => Math.abs(kg) > 0.5)
      .map(([ubicacion, kg]) => ({ ubicacion, kg: redondear(kg) }))
      .sort((a, b) => b.kg - a.kg),
    kgPorCategoriaComercial: [...porCategoria.entries()].map(([categoria, kg]) => ({
      categoria,
      kg: redondear(kg),
    })),
    historia,
    nota,
  };
}

async function parcelas(args: Args) {
  const rows = await prisma.parcela.findMany({
    where: {
      ...(str(args, "codigo") ? { codigo: str(args, "codigo") } : {}),
      ...(str(args, "variedad")
        ? { variedad: { contains: str(args, "variedad")!, mode: "insensitive" as const } }
        : {}),
      ...(str(args, "campania") ? { campania: { nombre: str(args, "campania") } } : {}),
    },
    select: {
      codigo: true,
      pivote: true,
      tercio: true,
      superficieHa: true,
      variedad: true,
      campania: { select: { nombre: true } },
      _count: { select: { muestreos: true, ordenes: true } },
      movimientos: {
        where: { tipo: { in: [...TIPOS_INGRESO] } },
        select: { items: { select: { kg: true } } },
      },
    },
    orderBy: [{ variedad: "asc" }, { codigo: "asc" }],
  });

  const filas = rows.map((p) => {
    const produccionKg = p.movimientos.reduce(
      (s, m) => s + m.items.reduce((a, i) => a + i.kg, 0),
      0,
    );
    return {
      codigo: p.codigo,
      variedad: p.variedad,
      campania: p.campania.nombre,
      superficieHa: p.superficieHa,
      pivote: p.pivote,
      tercio: p.tercio,
      produccionKg: redondear(produccionKg),
      rendimientoKgHa: p.superficieHa > 0 ? redondear(produccionKg / p.superficieHa) : 0,
      muestreos: p._count.muestreos,
      lineasDeOrden: p._count.ordenes,
    };
  });

  return {
    parcelas: filas.length,
    superficieTotalHa: redondear(filas.reduce((s, p) => s + p.superficieHa, 0), 2),
    filas,
  };
}

async function indicadores(args: Args) {
  const { porParcela, porVariedad, totales } = await calcularIndicadores({
    campania: str(args, "campania"),
    variedad: str(args, "variedad"),
  });

  const limpiar = <T extends { pctExportacion: number; rendimientoKgHa: number }>(x: T) => ({
    ...x,
    rendimientoKgHa: redondear(x.rendimientoKgHa),
    // El módulo devuelve una proporción; se pasa a puntos porcentuales para
    // que el modelo no tenga que multiplicar por cien y equivocarse.
    pctExportacion: redondear(x.pctExportacion * 100, 1),
  });

  return {
    totales: {
      ...limpiar(totales),
      superficieHa: redondear(totales.superficieHa, 2),
      produccionKg: redondear(totales.produccionKg),
      kgExportacion: redondear(totales.kgExportacion),
    },
    porVariedad: porVariedad.map((v) => ({
      ...limpiar(v),
      superficieHa: redondear(v.superficieHa, 2),
      produccionKg: redondear(v.produccionKg),
      kgExportacion: redondear(v.kgExportacion),
    })),
    porParcela: bool(args, "detalle")
      ? acotar(
          porParcela.map((p) => ({
            codigo: p.codigo,
            variedad: p.variedad,
            superficieHa: redondear(p.superficieHa, 2),
            produccionKg: redondear(p.produccionKg),
            rendimientoKgHa: redondear(p.rendimientoKgHa),
            pctExportacion: redondear(p.pctExportacion * 100, 1),
          })),
          MAX_FILAS,
        ).filas
      : undefined,
    nota: bool(args, "detalle")
      ? undefined
      : "Pedí detalle=true para ver el desglose parcela por parcela.",
  };
}

async function muestreos(args: Args) {
  const todas = await getMuestreos();
  const filtradas = todas.filter(
    (p) =>
      (!str(args, "parcela") || p.codigo === str(args, "parcela")) &&
      coincide(p.variedad, str(args, "variedad")),
  );

  return {
    parcelasMuestreadas: filtradas.length,
    parcelas: filtradas.map((p) => ({
      codigo: p.codigo,
      variedad: p.variedad,
      superficieHa: p.superficieHa,
      real: {
        kgIngresados: redondear(p.real.totalKgIngreso),
        kgExportacion: redondear(p.real.kgExportacion),
        pctExportacion:
          p.real.pctExportacion === null ? null : redondear(p.real.pctExportacion, 1),
      },
      muestreos: p.muestreos.map((m) => ({
        fecha: m.fecha.slice(0, 10),
        tratamiento: m.tratamiento,
        pesoMuestraKg: m.pesoTotalKg,
        nTuberculos: m.nTuberculos,
        tallosPorMetro: m.tallosPorMetro,
        proyeccion: {
          pctExportacion: redondear(m.proyeccion.comercial.pctExportacion, 1),
          pctSinChicas: redondear(m.proyeccion.comercial.pctSinChicas, 1),
          pctDescarteSemilla: redondear(m.proyeccion.comercial.pctDescarteSemilla, 1),
        },
        rendimientoEstimado: m.proyeccion.rendimiento.disponible
          ? {
              kgPorMetroLineal:
                m.proyeccion.rendimiento.kgPorMetroLineal === null
                  ? null
                  : redondear(m.proyeccion.rendimiento.kgPorMetroLineal, 3),
              pesoMedioTuberculoKg: redondear(
                m.proyeccion.rendimiento.pesoMedioTuberculoKg,
                4,
              ),
            }
          : null,
        calibres: bool(args, "calibres")
          ? m.proyeccion.distribucionCalibres.map((c) => ({
              rango: c.rango,
              salida: c.salida,
              pesoKg: c.pesoKg,
              cantidad: c.cantidad,
              pctPeso: redondear(c.pctPeso, 1),
            }))
          : undefined,
      })),
    })),
    nota:
      "Cuando una parcela tiene varios muestreos con fechas distintas, vale el más reciente: los anteriores son fotos del engorde, no se promedian.",
  };
}

async function ordenes(args: Args) {
  const resumen = await getResumenOrdenes({
    campania: str(args, "campania"),
    variedad: str(args, "variedad"),
  });

  const base = {
    ordenes: resumen.ordenes,
    aplicaciones: resumen.aplicaciones,
    costoTotalUsd: redondear(resumen.costoTotal, 2),
    hectareasCubiertas: redondear(resumen.hectareasCubiertas, 2),
    costoPorParcela: resumen.porParcela.map((p) => ({
      codigo: p.codigo,
      variedad: p.variedad,
      superficieHa: p.superficieHa,
      ordenes: p.ordenes,
      costoUsd: redondear(p.costo, 2),
      costoUsdHa: redondear(p.costoHa, 2),
    })),
    costoPorCategoria: resumen.porCategoria.map((c) => ({
      categoria: c.categoria,
      aplicaciones: c.aplicaciones,
      costoUsd: redondear(c.costo, 2),
      pctDelTotal: redondear(c.fraccion * 100, 1),
    })),
  };

  if (bool(args, "resumen")) return base;

  const todas = await getOrdenes();
  const filtradas = todas.filter(
    (o) =>
      (!str(args, "parcela") || o.parcela?.codigo === str(args, "parcela")) &&
      (!str(args, "estado") || o.estado === str(args, "estado")) &&
      coincide(o.parcela?.variedad, str(args, "variedad")),
  );

  const { filas, nota } = acotar(
    filtradas.map((o) => ({
      numero: o.numero,
      fechaTarea: o.fechaTarea.slice(0, 10),
      estado: o.estado,
      aplicador: o.aplicador,
      herramienta: o.herramienta,
      parcela: o.parcela?.codigo ?? null,
      superficieHa: o.parcela?.superficieHa ?? null,
      costoUsd: redondear(o.costoTotal, 2),
      insumos: o.lineas.map((l) => ({
        marca: l.marca,
        principioActivo: l.principioActivo,
        categoria: l.categoria,
        dosisHa: l.dosisHa,
        unidad: l.unidad,
        totalUso: redondear(l.totalUso, 2),
        costoUsd: redondear(l.costoUsd, 2),
      })),
    })),
    30,
  );

  return { ...base, detalle: filas, nota };
}

async function discrepancias() {
  const filas = await detectarDiscrepancias();
  return {
    discrepancias: filas.length,
    netoKg: redondear(filas.reduce((s, d) => s + d.diffKg, 0)),
    filas: filas.map((d) => ({
      ubicacion: d.locationNombre,
      variedad: d.variedad,
      lote: d.lote,
      esperadoKg: redondear(d.esperadoKg),
      contadoKg: redondear(d.contadoKg),
      diferenciaKg: redondear(d.diffKg),
      signo: d.diffKg < 0 ? "faltante" : "sobrante",
    })),
    nota:
      filas.length === 0
        ? "El stock derivado coincide con el último conteo físico de cada lote."
        : "Una diferencia no prueba un robo ni un error de sistema: lo más común es un remito sin asentar o un pesaje mal tomado.",
  };
}

async function catalogos(args: Args) {
  const que = str(args, "que") ?? "todo";
  const todo = que === "todo";
  const salida: Record<string, unknown> = {};

  if (todo || que === "ubicaciones") {
    salida.ubicaciones = await prisma.location.findMany({
      select: { nombre: true, tipo: true, esPropia: true },
      orderBy: { nombre: "asc" },
    });
  }
  if (todo || que === "campanias") {
    const rows = await prisma.campania.findMany({
      select: { nombre: true, desde: true, hasta: true },
      orderBy: { nombre: "asc" },
    });
    salida.campanias = rows.map((c) => ({
      nombre: c.nombre,
      desde: iso(c.desde),
      hasta: iso(c.hasta),
    }));
  }
  if (todo || que === "variedades") {
    const rows = await prisma.parcela.findMany({
      select: { variedad: true },
      distinct: ["variedad"],
      orderBy: { variedad: "asc" },
    });
    salida.variedadesSembradas = rows.map((r) => r.variedad);
  }
  if (todo || que === "clientes") {
    const rows = await prisma.movement.findMany({
      where: { cliente: { not: null } },
      select: { cliente: true },
      distinct: ["cliente"],
      orderBy: { cliente: "asc" },
    });
    salida.clientes = rows.map((r) => r.cliente);
  }
  if (todo || que === "insumos") {
    const rows = await prisma.insumo.findMany({
      select: {
        marca: true,
        principioActivo: true,
        categoria: true,
        precioUsd: true,
        dosisHaRecomendada: true,
        unidad: true,
      },
      orderBy: [{ categoria: "asc" }, { marca: "asc" }],
    });
    salida.insumos = rows;
  }

  return salida;
}

const EJECUTORES: Record<string, (args: Args) => Promise<unknown>> = {
  consultar_stock: stock,
  consultar_movimientos: movimientos,
  trazar_lote: trazar,
  consultar_parcelas: parcelas,
  consultar_indicadores: indicadores,
  consultar_muestreos: muestreos,
  consultar_ordenes: ordenes,
  consultar_discrepancias: discrepancias,
  consultar_catalogos: catalogos,
};

/**
 * Corre una herramienta por nombre. Nunca lanza: un error de la base tiene que
 * volver al modelo como texto para que pueda reformular o avisar, no tumbar la
 * conversación entera.
 */
export async function ejecutarHerramienta(
  nombre: string,
  args: Args,
): Promise<{ resultado: string; error: boolean }> {
  const ejecutor = EJECUTORES[nombre];
  if (!ejecutor) {
    return { resultado: `No existe la herramienta ${nombre}.`, error: true };
  }
  try {
    const datos = await ejecutor(args ?? {});
    return { resultado: JSON.stringify(datos), error: false };
  } catch (err) {
    console.error(`[asistente] fallo en ${nombre}`, err);
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { resultado: `La consulta falló: ${detalle}`, error: true };
  }
}
