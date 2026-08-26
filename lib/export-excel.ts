// Construcción de archivos .xlsx a partir de filas ya calculadas. No deriva
// nada: recibe los mismos datos que ya muestra la UI y los vuelca a hojas.
//
// El objetivo es que el archivo se pueda mandar por mail sin retocarlo: banda
// de título con la marca, fecha de emisión y quién lo pidió, encabezados
// fijos, filtro automático, formatos numéricos de verdad (no texto), fila de
// totales y hoja preparada para imprimir. Una hoja puede llevar más de una
// tabla, que es lo que necesita el reporte de movimientos separado por fecha.

import ExcelJS from "exceljs";

// Paleta tomada de app/globals.css para que el Excel se lea como parte del
// producto y no como una exportación genérica.
const VERDE_OSCURO = "FF1F4A32";
const VERDE_MEDIO = "FF2A5C3E";
const VERDE_CLARO = "FFEDF3EF";
const GRIS_CEBRA = "FFF7FAF8";
const BORDE = "FFDBE5DE";
const TINTA = "FF24352B";
const TINTA_SUAVE = "FF566158";
const ROJO = "FFA33224";

/** Cómo se formatea y alinea una columna. El ancho se calcula solo. */
export type FormatoCelda =
  | "texto"
  | "entero"
  | "decimal"
  | "hectareas"
  | "kg"
  // El valor ya viene en escala 0-100.
  | "porcentaje"
  // El valor viene como proporción 0-1 y Excel lo muestra como porcentaje.
  | "porcentajeRatio"
  | "puntos"
  | "moneda"
  | "fecha"
  | "fechaHora";

const NUMFMT: Record<FormatoCelda, string | undefined> = {
  texto: undefined,
  entero: "#,##0",
  decimal: "#,##0.00",
  hectareas: '#,##0.00 "ha"',
  kg: '#,##0 "kg"',
  porcentaje: '0.0"%"',
  porcentajeRatio: "0.0%",
  puntos: '+0.0" pts";-0.0" pts";0.0" pts"',
  moneda: '"U$S" #,##0.00',
  fecha: "dd/mm/yyyy",
  fechaHora: "dd/mm/yyyy hh:mm",
};

const ALINEACION: Record<FormatoCelda, "left" | "right" | "center"> = {
  texto: "left",
  entero: "right",
  decimal: "right",
  hectareas: "right",
  kg: "right",
  porcentaje: "right",
  porcentajeRatio: "right",
  puntos: "right",
  moneda: "right",
  fecha: "center",
  fechaHora: "center",
};

export type ExportColumna = {
  header: string;
  key: string;
  /** Ancho fijo en caracteres. Si falta, se calcula con el contenido. */
  width?: number;
  formato?: FormatoCelda;
  /** Suma la columna en la fila de totales de la tabla. */
  totalizar?: boolean;
  /** Pinta la celda en rojo cuando el predicado da true (desvíos, faltantes). */
  alerta?: (valor: unknown, fila: Record<string, unknown>) => boolean;
};

export type ExportTabla = {
  /** Encabezado de la tabla. Se usa cuando la hoja lleva más de una. */
  titulo?: string;
  /** Aclaración corta debajo del título. */
  subtitulo?: string;
  columnas: ExportColumna[];
  filas: Record<string, unknown>[];
  /** Agrega la fila de totales sumando las columnas con `totalizar`. */
  totales?: boolean;
  /** Texto que se muestra en lugar de la tabla cuando no hay filas. */
  vacio?: string;
};

export type ExportHoja = {
  nombre: string;
  titulo: string;
  descripcion?: string;
  /** Contexto del reporte: filtros aplicados, rangos, criterios de cálculo. */
  meta?: { label: string; value: string }[];
  tablas: ExportTabla[];
};

export type ExportLibro = {
  /** Nombre del reporte. Va en la banda de título de cada hoja. */
  titulo: string;
  /** Nombre del usuario que disparó la descarga. */
  generadoPor?: string;
  hojas: ExportHoja[];
};

const ANCHO_MIN = 10;
const ANCHO_MAX = 46;

function textoDe(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return "dd/mm/aaaa hh:mm";
  return String(valor);
}

/** Ancho aproximado en caracteres, acotado para que ninguna columna se dispare. */
function anchoAuto(columna: ExportColumna, filas: Record<string, unknown>[]): number {
  if (columna.width) return columna.width;
  let max = columna.header.length;
  for (const fila of filas) {
    const largo = textoDe(fila[columna.key]).length;
    if (largo > max) max = largo;
  }
  // Los números ocupan más de lo que dice su largo crudo por el formato
  // (separadores de miles, sufijo de unidad).
  const holgura = columna.formato && columna.formato !== "texto" ? 5 : 3;
  return Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, max + holgura));
}

function bordeFino(): Partial<ExcelJS.Borders> {
  const linea = { style: "thin" as const, color: { argb: BORDE } };
  return { top: linea, left: linea, bottom: linea, right: linea };
}

/**
 * Banda de título de la hoja: marca, nombre del reporte y contexto. Ocupa las
 * primeras filas y se repite en cada hoja para que una hoja suelta, impresa o
 * reenviada, siga diciendo de dónde salió.
 */
function escribirEncabezado(
  sheet: ExcelJS.Worksheet,
  libro: ExportLibro,
  hoja: ExportHoja,
  anchoCols: number,
): number {
  const ultima = Math.max(anchoCols, 4);
  let fila = 1;

  const marca = sheet.getRow(fila);
  marca.height = 26;
  sheet.mergeCells(fila, 1, fila, ultima);
  const celdaMarca = marca.getCell(1);
  celdaMarca.value = "PAPASUD TECH";
  celdaMarca.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  celdaMarca.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_OSCURO } };
  celdaMarca.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  fila++;

  const titulo = sheet.getRow(fila);
  titulo.height = 22;
  sheet.mergeCells(fila, 1, fila, ultima);
  const celdaTitulo = titulo.getCell(1);
  celdaTitulo.value = hoja.titulo;
  celdaTitulo.font = { name: "Calibri", size: 12, bold: true, color: { argb: TINTA } };
  celdaTitulo.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  celdaTitulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_CLARO } };
  fila++;

  if (hoja.descripcion) {
    sheet.mergeCells(fila, 1, fila, ultima);
    const celda = sheet.getRow(fila).getCell(1);
    celda.value = hoja.descripcion;
    celda.font = { name: "Calibri", size: 9, italic: true, color: { argb: TINTA_SUAVE } };
    celda.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_CLARO } };
    fila++;
  }

  const meta: { label: string; value: string }[] = [
    { label: "Emitido", value: formatoFechaHora(new Date()) },
    ...(libro.generadoPor ? [{ label: "Usuario", value: libro.generadoPor }] : []),
    ...(hoja.meta ?? []),
  ];

  sheet.mergeCells(fila, 1, fila, ultima);
  const celdaMeta = sheet.getRow(fila).getCell(1);
  celdaMeta.value = meta.map((m) => `${m.label}: ${m.value}`).join("   ·   ");
  celdaMeta.font = { name: "Calibri", size: 9, color: { argb: TINTA_SUAVE } };
  celdaMeta.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  celdaMeta.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_CLARO } };
  fila++;

  // Fila en blanco de respiro antes de la primera tabla.
  fila++;
  return fila;
}

type TablaEscrita = {
  /** Primera fila libre después de la tabla. */
  siguiente: number;
  filaHeader: number | null;
  /** Última fila de datos, sin contar la de totales. */
  ultimaFilaDatos: number | null;
};

/** Escribe una tabla completa y devuelve dónde quedó. */
function escribirTabla(
  sheet: ExcelJS.Worksheet,
  tabla: ExportTabla,
  filaInicio: number,
): TablaEscrita {
  let fila = filaInicio;
  const cols = tabla.columnas;

  if (tabla.titulo) {
    sheet.mergeCells(fila, 1, fila, cols.length);
    const celda = sheet.getRow(fila).getCell(1);
    celda.value = tabla.titulo;
    celda.font = { name: "Calibri", size: 11, bold: true, color: { argb: VERDE_MEDIO } };
    celda.alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(fila).height = 20;
    fila++;
  }

  if (tabla.subtitulo) {
    sheet.mergeCells(fila, 1, fila, cols.length);
    const celda = sheet.getRow(fila).getCell(1);
    celda.value = tabla.subtitulo;
    celda.font = { name: "Calibri", size: 9, color: { argb: TINTA_SUAVE } };
    fila++;
  }

  if (tabla.filas.length === 0) {
    sheet.mergeCells(fila, 1, fila, cols.length);
    const celda = sheet.getRow(fila).getCell(1);
    celda.value = tabla.vacio ?? "Sin datos para el criterio seleccionado.";
    celda.font = { name: "Calibri", size: 10, italic: true, color: { argb: TINTA_SUAVE } };
    celda.alignment = { horizontal: "left" };
    return { siguiente: fila + 2, filaHeader: null, ultimaFilaDatos: null };
  }

  const filaHeader = fila;
  const header = sheet.getRow(filaHeader);
  header.height = 20;
  cols.forEach((col, i) => {
    const celda = header.getCell(i + 1);
    celda.value = col.header;
    celda.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_MEDIO } };
    celda.alignment = {
      vertical: "middle",
      horizontal: ALINEACION[col.formato ?? "texto"],
      wrapText: true,
    };
    celda.border = bordeFino();
  });
  fila++;

  tabla.filas.forEach((datos, idx) => {
    const row = sheet.getRow(fila);
    cols.forEach((col, i) => {
      const celda = row.getCell(i + 1);
      const valor = datos[col.key];
      celda.value = (valor ?? "") as ExcelJS.CellValue;

      const formato = col.formato ?? "texto";
      const numFmt = NUMFMT[formato];
      // Solo se aplica formato numérico si el valor es realmente un número:
      // las celdas que traen texto explicativo ("sin ingresos") tienen que
      // seguir leyéndose como texto y no como un cero mal formateado.
      if (numFmt && (typeof valor === "number" || valor instanceof Date)) {
        celda.numFmt = numFmt;
      }
      celda.alignment = {
        vertical: "middle",
        horizontal: typeof valor === "number" ? ALINEACION[formato] : "left",
      };
      celda.border = bordeFino();
      celda.font = { name: "Calibri", size: 10, color: { argb: TINTA } };
      if (col.alerta?.(valor, datos)) {
        celda.font = { name: "Calibri", size: 10, bold: true, color: { argb: ROJO } };
      }
      if (idx % 2 === 1) {
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS_CEBRA } };
      }
    });
    fila++;
  });

  const primeraDato = filaHeader + 1;
  const ultimaDato = fila - 1;

  if (tabla.totales) {
    const row = sheet.getRow(fila);
    row.height = 18;
    cols.forEach((col, i) => {
      const celda = row.getCell(i + 1);
      if (i === 0) {
        celda.value = "Total";
      } else if (col.totalizar) {
        const letra = sheet.getColumn(i + 1).letter;
        // Fórmula y no número: si el usuario filtra o edita, el total sigue
        // siendo consistente con lo que tiene delante.
        celda.value = {
          formula: `SUM(${letra}${primeraDato}:${letra}${ultimaDato})`,
          date1904: false,
        };
        const numFmt = NUMFMT[col.formato ?? "texto"];
        if (numFmt) celda.numFmt = numFmt;
      }
      celda.font = { name: "Calibri", size: 10, bold: true, color: { argb: TINTA } };
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_CLARO } };
      celda.alignment = {
        vertical: "middle",
        horizontal: i === 0 ? "left" : ALINEACION[col.formato ?? "texto"],
      };
      celda.border = {
        ...bordeFino(),
        top: { style: "medium", color: { argb: VERDE_MEDIO } },
      };
    });
    fila++;
  }

  return { siguiente: fila + 2, filaHeader, ultimaFilaDatos: ultimaDato };
}

function formatoFechaHora(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export async function construirExcel(libro: ExportLibro): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Papasud Tech";
  wb.lastModifiedBy = libro.generadoPor ?? "Papasud Tech";
  wb.created = new Date();
  wb.modified = new Date();
  wb.title = libro.titulo;
  wb.company = "Papasud";

  for (const hoja of libro.hojas) {
    // Excel limita el nombre de hoja a 31 caracteres y no acepta : \ / ? * [ ]
    const nombre = hoja.nombre.replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
    const sheet = wb.addWorksheet(nombre, {
      views: [{ showGridLines: false }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.5,
          bottom: 0.5,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    const maxCols = hoja.tablas.reduce((m, t) => Math.max(m, t.columnas.length), 1);

    // Los anchos se fijan por hoja y no por tabla: en una hoja con varias
    // tablas las columnas son las mismas, así que alcanza con mirar todas las
    // filas juntas para que las tablas queden alineadas entre sí.
    const anchoPorIndice = new Map<number, number>();
    for (const tabla of hoja.tablas) {
      tabla.columnas.forEach((col, i) => {
        const ancho = anchoAuto(col, tabla.filas);
        anchoPorIndice.set(i, Math.max(anchoPorIndice.get(i) ?? 0, ancho));
      });
    }
    for (const [i, ancho] of anchoPorIndice) {
      sheet.getColumn(i + 1).width = ancho;
    }

    let fila = escribirEncabezado(sheet, libro, hoja, maxCols);

    let primerHeader: number | null = null;
    let primeraUltimaFila: number | null = null;
    for (const tabla of hoja.tablas) {
      const escrita = escribirTabla(sheet, tabla, fila);
      if (escrita.filaHeader !== null && primerHeader === null) {
        primerHeader = escrita.filaHeader;
        primeraUltimaFila = escrita.ultimaFilaDatos;
      }
      fila = escrita.siguiente;
    }

    if (primerHeader !== null) {
      // Panel congelado: el encabezado de la primera tabla queda siempre a la
      // vista al hacer scroll, y se repite arriba de cada página impresa.
      sheet.views = [
        { state: "frozen", ySplit: primerHeader, showGridLines: false },
      ];
      sheet.pageSetup.printTitlesRow = `${primerHeader}:${primerHeader}`;

      // Excel admite un solo filtro automático por hoja. En una hoja de varias
      // tablas, filtrar una sola descoloca la lectura de las demás, así que no
      // se pone: esas hojas se leen de corrido, tabla por tabla.
      if (hoja.tablas.length === 1 && primeraUltimaFila !== null) {
        sheet.autoFilter = {
          from: { row: primerHeader, column: 1 },
          to: { row: primeraUltimaFila, column: hoja.tablas[0]!.columnas.length },
        };
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
