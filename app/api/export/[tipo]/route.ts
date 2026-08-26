// Descarga de Excel para las vistas que lo piden. Un handler para los cinco
// tipos en vez de cinco archivos casi idénticos; cada caso arma sus hojas a
// partir de los mismos DTOs que ya usan las páginas, sin recalcular nada.
//
// Cada reporte trae más de una hoja: una de resumen para leer de un vistazo y
// una de detalle para trabajar. El formato lo pone lib/export-excel.ts.

import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/auth";
import { getStock, getMovimientos, detectarDiscrepancias } from "@/lib/actions/stock";
import { getIndicadores } from "@/lib/actions/indicadores";
import { getMuestreos } from "@/lib/actions/muestreos";
import { filasProyeccion } from "@/app/components/ProyeccionPanel";
import { agruparPorFecha, kgDeMovimiento } from "@/lib/movimientos-por-fecha";
import { MOVEMENT_TYPE_LABELS } from "@/app/components/format";
import { construirExcel, type ExportHoja, type ExportLibro } from "@/lib/export-excel";

const TIPOS_VALIDOS = [
  "stock",
  "movimientos",
  "indicadores",
  "muestreos",
  "discrepancias",
] as const;
type Tipo = (typeof TIPOS_VALIDOS)[number];

const NOMBRE_REPORTE: Record<Tipo, string> = {
  stock: "Stock por ubicación",
  movimientos: "Movimientos de depósito",
  indicadores: "Indicadores de campaña",
  muestreos: "Proyección de cosecha",
  discrepancias: "Discrepancias de inventario",
};

/** Cuántos movimientos entran en el archivo. Bien por encima del uso real. */
const LIMITE_MOVIMIENTOS = 1000;

function esTipoValido(valor: string): valor is Tipo {
  return (TIPOS_VALIDOS as readonly string[]).includes(valor);
}

function redondear(n: number, decimales = 0): number {
  const factor = 10 ** decimales;
  return Math.round(n * factor) / factor;
}

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function hora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const CATEGORIA_LABEL: Record<string, string> = {
  EXPORTACION: "Exportación",
  SIN_CHICAS: "Sin chicas",
  RECIBO: "Recibo",
  GRANEL: "Granel",
  DESCARTE_PARAGUAY: "Descarte Paraguay",
  SOLO_CHASIS: "Solo chasis",
  SEMILLA: "Semilla",
};

const TIPO_UBICACION_LABEL: Record<string, string> = {
  CAMPO: "Campo",
  PLANTA: "Planta",
  GALPON: "Galpón",
  FRIGORIFICO: "Frigorífico",
  CLIENTE: "Cliente",
};

// ---------------------------------------------------------------------------
// Armado de cada reporte
// ---------------------------------------------------------------------------

async function hojasStock(): Promise<ExportHoja[]> {
  const stock = await getStock();
  const totalKg = stock.reduce((s, u) => s + u.totalKg, 0);

  const resumen = stock.map((u) => ({
    ubicacion: u.location.nombre,
    tipo: TIPO_UBICACION_LABEL[u.location.tipo] ?? u.location.tipo,
    lotes: u.rows.length,
    kg: redondear(u.totalKg),
    bolsas: u.totalBolsas,
    participacion: totalKg > 0 ? u.totalKg / totalKg : 0,
  }));

  // Una misma variedad puede estar repartida en varios lotes y ubicaciones:
  // esta vista responde "cuánto tengo de spunta en total", que es la pregunta
  // con la que se sale a vender.
  const porVariedad = new Map<string, { kg: number; bolsas: number; lotes: number }>();
  for (const u of stock) {
    for (const r of u.rows) {
      const prev = porVariedad.get(r.variedad) ?? { kg: 0, bolsas: 0, lotes: 0 };
      prev.kg += r.kg;
      prev.bolsas += r.bolsas;
      prev.lotes += 1;
      porVariedad.set(r.variedad, prev);
    }
  }

  const detalle = stock.flatMap((u) =>
    u.rows.map((r) => ({
      ubicacion: u.location.nombre,
      tipo: TIPO_UBICACION_LABEL[u.location.tipo] ?? u.location.tipo,
      variedad: r.variedad,
      lote: r.lote,
      kg: redondear(r.kg),
      bolsas: r.bolsas,
      kgPromedio: r.bolsas > 0 ? redondear(r.kg / r.bolsas, 2) : "",
    })),
  );

  return [
    {
      nombre: "Resumen",
      titulo: "Stock por ubicación",
      descripcion:
        "El stock no está guardado en ninguna tabla: sale de sumar todos los movimientos contra el origen y el destino de cada remito.",
      meta: [
        { label: "Ubicaciones propias", value: String(stock.length) },
        { label: "Total", value: `${redondear(totalKg).toLocaleString("es-AR")} kg` },
      ],
      tablas: [
        {
          titulo: "Por ubicación",
          columnas: [
            { header: "Ubicación", key: "ubicacion", formato: "texto" },
            { header: "Tipo", key: "tipo", formato: "texto" },
            { header: "Lotes", key: "lotes", formato: "entero", totalizar: true },
            { header: "Kilos", key: "kg", formato: "kg", totalizar: true },
            { header: "Bolsas", key: "bolsas", formato: "entero", totalizar: true },
            { header: "% del total", key: "participacion", formato: "porcentajeRatio" },
          ],
          filas: resumen,
          totales: true,
        },
        {
          titulo: "Por variedad",
          subtitulo: "Consolidado de todas las ubicaciones propias.",
          columnas: [
            { header: "Variedad", key: "variedad", formato: "texto" },
            { header: "Lotes", key: "lotes", formato: "entero", totalizar: true },
            { header: "Kilos", key: "kg", formato: "kg", totalizar: true },
            { header: "Bolsas", key: "bolsas", formato: "entero", totalizar: true },
          ],
          filas: [...porVariedad.entries()]
            .sort((a, b) => b[1].kg - a[1].kg)
            .map(([variedad, v]) => ({
              variedad,
              lotes: v.lotes,
              kg: redondear(v.kg),
              bolsas: v.bolsas,
            })),
          totales: true,
        },
      ],
    },
    {
      nombre: "Detalle por lote",
      titulo: "Stock detallado por lote",
      descripcion:
        "Un renglón por ubicación, variedad y lote. El mismo número de lote en dos ubicaciones distintas es mercadería distinta.",
      tablas: [
        {
          columnas: [
            { header: "Ubicación", key: "ubicacion", formato: "texto" },
            { header: "Tipo", key: "tipo", formato: "texto" },
            { header: "Variedad", key: "variedad", formato: "texto" },
            { header: "Lote", key: "lote", formato: "texto" },
            { header: "Kilos", key: "kg", formato: "kg", totalizar: true },
            { header: "Bolsas", key: "bolsas", formato: "entero", totalizar: true },
            { header: "Kg / bolsa", key: "kgPromedio", formato: "decimal" },
          ],
          filas: detalle,
          totales: true,
          vacio: "No hay stock disponible en ninguna ubicación propia.",
        },
      ],
    },
  ];
}

async function hojasMovimientos(): Promise<ExportHoja[]> {
  const movimientos = await getMovimientos(LIMITE_MOVIMIENTOS);
  const dias = agruparPorFecha(movimientos);

  const resumenDias = dias.map((d) => ({
    fecha: fechaCorta(d.movimientos[0]!.fecha),
    dia: d.etiqueta.split(" ")[0],
    remitos: d.remitos,
    kg: redondear(d.totalKg),
    bolsas: d.totalBolsas,
  }));

  const porTipo = new Map<string, { remitos: number; kg: number }>();
  for (const mov of movimientos) {
    const prev = porTipo.get(mov.tipo) ?? { remitos: 0, kg: 0 };
    prev.remitos += 1;
    prev.kg += kgDeMovimiento(mov);
    porTipo.set(mov.tipo, prev);
  }

  // Una hoja por día es inmanejable con cientos de días. En su lugar, una sola
  // hoja de detalle con una tabla independiente por fecha, cada una con su
  // encabezado y su total: es lo mismo que muestra la pantalla.
  const tablasPorDia = dias.map((d) => ({
    titulo: d.etiqueta,
    subtitulo: `${d.remitos} ${d.remitos === 1 ? "remito" : "remitos"} · ${redondear(
      d.totalKg,
    ).toLocaleString("es-AR")} kg`,
    columnas: [
      { header: "Hora", key: "hora", formato: "texto" as const, width: 8 },
      { header: "Remito", key: "remito", formato: "texto" as const },
      { header: "Movimiento", key: "tipo", formato: "texto" as const },
      { header: "Origen", key: "origen", formato: "texto" as const },
      { header: "Destino", key: "destino", formato: "texto" as const },
      { header: "Variedad", key: "variedad", formato: "texto" as const },
      { header: "Lote", key: "lote", formato: "texto" as const },
      { header: "Categoría", key: "categoria", formato: "texto" as const },
      { header: "Kilos", key: "kg", formato: "kg" as const, totalizar: true },
      { header: "Bolsas", key: "bolsas", formato: "entero" as const, totalizar: true },
      { header: "Transporte", key: "transporte", formato: "texto" as const },
      { header: "Cliente", key: "cliente", formato: "texto" as const },
    ],
    filas: d.movimientos.flatMap((m) =>
      m.items.map((it, i) => ({
        // Los datos de cabecera se repiten solo en la primera línea del
        // remito: un remito de cuatro líneas se lee como un bloque y no como
        // cuatro movimientos distintos.
        hora: i === 0 ? hora(m.fecha) : "",
        remito: i === 0 ? (m.remito ?? "sin remito") : "",
        tipo: i === 0 ? (MOVEMENT_TYPE_LABELS[m.tipo] ?? m.tipo) : "",
        origen: i === 0 ? m.origen : "",
        destino: i === 0 ? m.destino : "",
        variedad: it.variedad,
        lote: it.lote,
        categoria: it.categoria ? (CATEGORIA_LABEL[it.categoria] ?? it.categoria) : "",
        kg: redondear(it.kg),
        bolsas: it.bolsas ?? "",
        transporte: i === 0 ? (m.transporte ?? "") : "",
        cliente: i === 0 ? (m.cliente ?? "") : "",
      })),
    ),
    totales: true,
  }));

  const totalKg = movimientos.reduce((s, m) => s + kgDeMovimiento(m), 0);

  return [
    {
      nombre: "Resumen",
      titulo: "Movimientos de depósito",
      descripcion:
        "Cada remito asentado sostiene el stock. Nada se carga como saldo: se carga como movimiento, y el saldo se deriva.",
      meta: [
        { label: "Remitos", value: String(movimientos.length) },
        { label: "Días con actividad", value: String(dias.length) },
        { label: "Total movido", value: `${redondear(totalKg).toLocaleString("es-AR")} kg` },
      ],
      tablas: [
        {
          titulo: "Por tipo de movimiento",
          columnas: [
            { header: "Movimiento", key: "tipo", formato: "texto" },
            { header: "Remitos", key: "remitos", formato: "entero", totalizar: true },
            { header: "Kilos", key: "kg", formato: "kg", totalizar: true },
            { header: "% de los kilos", key: "participacion", formato: "porcentajeRatio" },
          ],
          filas: [...porTipo.entries()]
            .sort((a, b) => b[1].kg - a[1].kg)
            .map(([tipo, v]) => ({
              tipo: MOVEMENT_TYPE_LABELS[tipo as keyof typeof MOVEMENT_TYPE_LABELS] ?? tipo,
              remitos: v.remitos,
              kg: redondear(v.kg),
              participacion: totalKg > 0 ? v.kg / totalKg : 0,
            })),
          totales: true,
        },
        {
          titulo: "Por día",
          subtitulo: "Del más reciente al más antiguo.",
          columnas: [
            { header: "Fecha", key: "fecha", formato: "texto" },
            { header: "Día", key: "dia", formato: "texto" },
            { header: "Remitos", key: "remitos", formato: "entero", totalizar: true },
            { header: "Kilos", key: "kg", formato: "kg", totalizar: true },
            { header: "Bolsas", key: "bolsas", formato: "entero", totalizar: true },
          ],
          filas: resumenDias,
          totales: true,
        },
      ],
    },
    {
      nombre: "Detalle por fecha",
      titulo: "Movimientos día por día",
      descripcion:
        "Una tabla por jornada, con el total del día al pie. Los datos de cabecera del remito se escriben una sola vez y las líneas siguientes cuelgan de él.",
      tablas:
        tablasPorDia.length > 0
          ? tablasPorDia
          : [
              {
                columnas: [{ header: "Fecha", key: "fecha", formato: "texto" as const }],
                filas: [],
                vacio: "Todavía no hay movimientos registrados.",
              },
            ],
    },
  ];
}

async function hojasIndicadores(campania?: string, variedad?: string): Promise<ExportHoja[]> {
  const { porParcela, porVariedad, totales } = await getIndicadores({ campania, variedad });

  return [
    {
      nombre: "Resumen",
      titulo: "Indicadores de campaña",
      descripcion:
        "Producción y rendimiento salen de los movimientos de ingreso desde campo. Los kilos de exportación no: la categoría comercial se asigna después de tamañar y se atribuye a la parcela siguiendo el par variedad-lote.",
      meta: [
        { label: "Campaña", value: campania ?? "todas" },
        { label: "Variedad", value: variedad ?? "todas" },
        { label: "Parcelas", value: String(totales.parcelas) },
      ],
      tablas: [
        {
          titulo: "Totales de la campaña",
          columnas: [
            { header: "Concepto", key: "concepto", formato: "texto", width: 28 },
            { header: "Valor", key: "valor", formato: "decimal", width: 18 },
            { header: "Unidad", key: "unidad", formato: "texto", width: 12 },
          ],
          filas: [
            { concepto: "Parcelas", valor: totales.parcelas, unidad: "" },
            { concepto: "Superficie", valor: redondear(totales.superficieHa, 2), unidad: "ha" },
            { concepto: "Producción", valor: redondear(totales.produccionKg), unidad: "kg" },
            {
              concepto: "Rendimiento",
              valor: redondear(totales.rendimientoKgHa),
              unidad: "kg/ha",
            },
            { concepto: "Exportación", valor: redondear(totales.kgExportacion), unidad: "kg" },
            {
              concepto: "Exportación sobre producción",
              valor: redondear(totales.pctExportacion * 100, 1),
              unidad: "%",
            },
            { concepto: "Bolsas", valor: totales.bolsas, unidad: "" },
          ],
        },
        {
          titulo: "Por variedad",
          subtitulo:
            "El rendimiento y el porcentaje de exportación se recalculan sobre los totales de la variedad, no son el promedio de sus parcelas.",
          columnas: [
            { header: "Variedad", key: "variedad", formato: "texto" },
            { header: "Parcelas", key: "parcelas", formato: "entero", totalizar: true },
            { header: "Superficie", key: "superficieHa", formato: "hectareas", totalizar: true },
            { header: "Producción", key: "produccionKg", formato: "kg", totalizar: true },
            { header: "Rendimiento", key: "rendimientoKgHa", formato: "entero" },
            { header: "Exportación", key: "kgExportacion", formato: "kg", totalizar: true },
            { header: "% exportación", key: "pctExportacion", formato: "porcentajeRatio" },
            { header: "Bolsas", key: "bolsas", formato: "entero", totalizar: true },
          ],
          filas: porVariedad.map((v) => ({
            variedad: v.variedad,
            parcelas: v.parcelas,
            superficieHa: redondear(v.superficieHa, 2),
            produccionKg: redondear(v.produccionKg),
            rendimientoKgHa: redondear(v.rendimientoKgHa),
            kgExportacion: redondear(v.kgExportacion),
            pctExportacion: v.pctExportacion,
            bolsas: v.bolsas,
          })),
          totales: true,
        },
      ],
    },
    {
      nombre: "Por parcela",
      titulo: "Indicadores por parcela",
      descripcion:
        "Una parcela sin producción no está mal cargada: puede no haberse cosechado todavía, o sus ingresos pueden no tener parcela asignada.",
      meta: [
        { label: "Campaña", value: campania ?? "todas" },
        { label: "Variedad", value: variedad ?? "todas" },
      ],
      tablas: [
        {
          columnas: [
            { header: "Parcela", key: "codigo", formato: "texto" },
            { header: "Variedad", key: "variedad", formato: "texto" },
            { header: "Campaña", key: "campania", formato: "texto" },
            { header: "Superficie", key: "superficieHa", formato: "hectareas", totalizar: true },
            { header: "Producción", key: "produccionKg", formato: "kg", totalizar: true },
            { header: "Rendimiento", key: "rendimientoKgHa", formato: "entero" },
            { header: "Exportación", key: "kgExportacion", formato: "kg", totalizar: true },
            { header: "% exportación", key: "pctExportacion", formato: "porcentajeRatio" },
            { header: "Bolsas", key: "bolsas", formato: "entero", totalizar: true },
          ],
          filas: porParcela.map((p) => ({
            codigo: p.codigo,
            variedad: p.variedad,
            campania: p.campania,
            superficieHa: redondear(p.superficieHa, 2),
            produccionKg: redondear(p.produccionKg),
            rendimientoKgHa: redondear(p.rendimientoKgHa),
            kgExportacion: redondear(p.kgExportacion),
            pctExportacion: p.pctExportacion,
            bolsas: p.bolsas,
          })),
          totales: true,
          vacio: "Ninguna parcela coincide con el filtro aplicado.",
        },
      ],
    },
  ];
}

async function hojasMuestreos(): Promise<ExportHoja[]> {
  const parcelas = await getMuestreos();
  const filas = filasProyeccion(parcelas);

  const conReal = filas.filter((f) => f.desvioPts !== null);
  const desvioMedio =
    conReal.length > 0
      ? conReal.reduce((s, f) => s + Math.abs(f.desvioPts ?? 0), 0) / conReal.length
      : 0;

  return [
    {
      nombre: "Proyección",
      titulo: "Proyección de cosecha contra real",
      descripcion:
        "La proyección es aritmética sobre la distribución de calibres del muestreo pre-cosecha, sin modelo predictivo. Cuando una parcela tiene varios muestreos, vale el más reciente.",
      meta: [
        { label: "Parcelas muestreadas", value: String(filas.length) },
        { label: "Con cosecha para contrastar", value: String(conReal.length) },
        { label: "Desvío medio absoluto", value: `${redondear(desvioMedio, 1)} pts` },
      ],
      tablas: [
        {
          columnas: [
            { header: "Parcela", key: "codigo", formato: "texto" },
            { header: "Variedad", key: "variedad", formato: "texto" },
            { header: "Superficie", key: "superficieHa", formato: "hectareas", totalizar: true },
            { header: "Muestreo", key: "fechaMuestreo", formato: "texto" },
            { header: "% proyectado", key: "proyectadoPct", formato: "porcentaje" },
            { header: "% real", key: "realPct", formato: "porcentaje" },
            {
              header: "Desvío",
              key: "desvioPts",
              formato: "puntos",
              // Diez puntos es el mismo umbral con el que la pantalla destaca
              // una parcela: por encima de eso el muestreo no sirvió para
              // anticipar la cosecha y hay que mirar por qué.
              alerta: (valor) => typeof valor === "number" && Math.abs(valor) >= 10,
            },
            { header: "Kg ingresados", key: "totalKgIngreso", formato: "kg", totalizar: true },
            { header: "Kg exportación", key: "kgExportacion", formato: "kg", totalizar: true },
          ],
          filas: filas.map((f) => ({
            codigo: f.codigo,
            variedad: f.variedad,
            superficieHa: redondear(f.superficieHa, 2),
            fechaMuestreo: f.fechaProyeccion ? fechaCorta(f.fechaProyeccion) : "",
            proyectadoPct: redondear(f.proyectadoPct, 1),
            // null se vuelca como texto explícito: no hay dato real todavía,
            // no es un cero.
            realPct: f.realPct !== null ? redondear(f.realPct, 1) : "sin ingresos",
            desvioPts: f.desvioPts !== null ? redondear(f.desvioPts, 1) : "",
            totalKgIngreso: redondear(f.totalKgIngreso),
            kgExportacion: redondear(f.kgExportacion),
          })),
          totales: true,
          vacio: "Todavía no hay muestreos pre-cosecha cargados.",
        },
      ],
    },
    {
      nombre: "Muestreos",
      titulo: "Muestreos pre-cosecha",
      descripcion:
        "Un renglón por muestreo. Cuando la parcela tiene ensayo, cada tratamiento se muestrea por separado.",
      tablas: [
        {
          columnas: [
            { header: "Parcela", key: "codigo", formato: "texto" },
            { header: "Variedad", key: "variedad", formato: "texto" },
            { header: "Fecha", key: "fecha", formato: "texto" },
            { header: "Tratamiento", key: "tratamiento", formato: "texto" },
            { header: "Peso muestra", key: "pesoTotalKg", formato: "decimal" },
            { header: "Tubérculos", key: "nTuberculos", formato: "entero" },
            { header: "Tallos", key: "tallos", formato: "entero" },
            { header: "Tallos / m", key: "tallosPorMetro", formato: "decimal" },
            { header: "% exportación", key: "pctExportacion", formato: "porcentaje" },
            { header: "% sin chicas", key: "pctSinChicas", formato: "porcentaje" },
            { header: "% descarte", key: "pctDescarte", formato: "porcentaje" },
          ],
          filas: parcelas.flatMap((p) =>
            p.muestreos.map((m) => ({
              codigo: p.codigo,
              variedad: p.variedad,
              fecha: fechaCorta(m.fecha),
              tratamiento: m.tratamiento ?? "Sin tratamiento",
              pesoTotalKg: redondear(m.pesoTotalKg, 3),
              nTuberculos: m.nTuberculos,
              tallos: m.tallos ?? "",
              tallosPorMetro: m.tallosPorMetro ?? "",
              pctExportacion: redondear(m.proyeccion.comercial.pctExportacion, 1),
              pctSinChicas: redondear(m.proyeccion.comercial.pctSinChicas, 1),
              pctDescarte: redondear(m.proyeccion.comercial.pctDescarteSemilla, 1),
            })),
          ),
          vacio: "Todavía no hay muestreos pre-cosecha cargados.",
        },
      ],
    },
    {
      nombre: "Calibres",
      titulo: "Distribución por calibre",
      descripcion:
        "El dato crudo del que sale la proyección. Cada rango se clasifica por su milimetraje representativo: más de 45 mm es exportación, entre 30 y 45 sin chicas, menos de 30 descarte o semilla.",
      tablas: [
        {
          columnas: [
            { header: "Parcela", key: "codigo", formato: "texto" },
            { header: "Fecha", key: "fecha", formato: "texto" },
            { header: "Tratamiento", key: "tratamiento", formato: "texto" },
            { header: "Calibre", key: "rango", formato: "texto" },
            { header: "Salida", key: "salida", formato: "texto" },
            { header: "Peso", key: "pesoKg", formato: "decimal" },
            { header: "Tubérculos", key: "cantidad", formato: "entero" },
            { header: "% del peso", key: "pctPeso", formato: "porcentaje" },
            { header: "% de la cantidad", key: "pctCantidad", formato: "porcentaje" },
            { header: "Peso medio", key: "pesoMedio", formato: "decimal" },
          ],
          filas: parcelas.flatMap((p) =>
            p.muestreos.flatMap((m) =>
              m.proyeccion.distribucionCalibres.map((c) => ({
                codigo: p.codigo,
                fecha: fechaCorta(m.fecha),
                tratamiento: m.tratamiento ?? "Sin tratamiento",
                rango: `${c.rango} mm`,
                salida:
                  c.salida === "EXPORTACION"
                    ? "Exportación"
                    : c.salida === "SIN_CHICAS"
                      ? "Sin chicas"
                      : "Descarte / semilla",
                pesoKg: redondear(c.pesoKg, 3),
                cantidad: c.cantidad,
                pctPeso: redondear(c.pctPeso, 1),
                pctCantidad: redondear(c.pctCantidad, 1),
                pesoMedio: redondear(c.pesoMedioTuberculoKg, 3),
              })),
            ),
          ),
          vacio: "Todavía no hay muestreos pre-cosecha cargados.",
        },
      ],
    },
  ];
}

async function hojasDiscrepancias(): Promise<ExportHoja[]> {
  const discrepancias = await detectarDiscrepancias();
  const faltantes = discrepancias.filter((d) => d.diffKg < 0);
  const sobrantes = discrepancias.filter((d) => d.diffKg > 0);
  const netoKg = discrepancias.reduce((s, d) => s + d.diffKg, 0);

  return [
    {
      nombre: "Discrepancias",
      titulo: "Discrepancias de inventario",
      descripcion:
        "Diferencia entre el stock esperado, que sale de los movimientos, y el conteo físico más reciente de cada lote. Una diferencia no es un error de sistema: es una pregunta para el depósito.",
      meta: [
        { label: "Lotes con diferencia", value: String(discrepancias.length) },
        { label: "Faltantes", value: String(faltantes.length) },
        { label: "Sobrantes", value: String(sobrantes.length) },
        { label: "Neto", value: `${redondear(netoKg).toLocaleString("es-AR")} kg` },
      ],
      tablas: [
        {
          columnas: [
            { header: "Ubicación", key: "ubicacion", formato: "texto" },
            { header: "Variedad", key: "variedad", formato: "texto" },
            { header: "Lote", key: "lote", formato: "texto" },
            { header: "Esperado", key: "esperadoKg", formato: "kg", totalizar: true },
            { header: "Contado", key: "contadoKg", formato: "kg", totalizar: true },
            {
              header: "Diferencia",
              key: "diffKg",
              formato: "kg",
              totalizar: true,
              alerta: (valor) => typeof valor === "number" && valor < 0,
            },
            { header: "Signo", key: "signo", formato: "texto" },
          ],
          filas: discrepancias.map((d) => ({
            ubicacion: d.locationNombre,
            variedad: d.variedad,
            lote: d.lote,
            esperadoKg: redondear(d.esperadoKg),
            contadoKg: redondear(d.contadoKg),
            diffKg: redondear(d.diffKg),
            signo: d.diffKg < 0 ? "Faltante" : "Sobrante",
          })),
          totales: true,
          vacio: "No hay diferencias entre el stock derivado y el último conteo físico.",
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tipo: string }> },
) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { tipo } = await params;
  if (!esTipoValido(tipo)) {
    return new NextResponse("Tipo de exportación desconocido", { status: 404 });
  }

  const url = new URL(request.url);
  let hojas: ExportHoja[];

  switch (tipo) {
    case "stock":
      hojas = await hojasStock();
      break;
    case "movimientos":
      hojas = await hojasMovimientos();
      break;
    case "indicadores":
      hojas = await hojasIndicadores(
        url.searchParams.get("campania") ?? undefined,
        url.searchParams.get("variedad") ?? undefined,
      );
      break;
    case "muestreos":
      hojas = await hojasMuestreos();
      break;
    case "discrepancias":
      hojas = await hojasDiscrepancias();
      break;
  }

  const libro: ExportLibro = {
    titulo: NOMBRE_REPORTE[tipo],
    generadoPor: usuario.nombre,
    hojas,
  };

  const buffer = await construirExcel(libro);
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="papasud-${tipo}-${fecha}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
