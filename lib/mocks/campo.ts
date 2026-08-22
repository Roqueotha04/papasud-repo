// Datos de ejemplo para las vistas de preview de Raíz Tech (gestión agronómica de papa).
// Sale de planillas reales del cliente. NO hay conexión a base de datos: todo vive acá.

export type Aplicador = "Daniel" | "Martín" | "Gustavo";
export type Herramienta = "Drone" | "Pulverizadora";
export type EstadoOrden = "Borrador" | "Emitida" | "Ejecutada";
export type Categoria = "Herbicida" | "Insecticida" | "Fungicida";

export type Parcela = {
  codigo: string;
  variedad: string;
  superficieHa: number;
};

export type Insumo = {
  id: string;
  marca: string;
  principioActivo: string;
  categoria: Categoria;
  precioUsd: number; // U$S por unidad de dosis
  dosisHaRecomendada: number; // unidad / ha
};

export type LineaOrden = {
  insumoId: string;
  dosisHa: number;
};

export type OrdenTrabajo = {
  numero: number;
  fechaEmision: string; // ISO local, sin Z
  fechaTarea: string; // ISO local, sin Z (incluye hora)
  aplicador: Aplicador;
  herramienta: Herramienta;
  parcelaCodigo: string;
  estado: EstadoOrden;
  lineas: LineaOrden[];
};

export type ProduccionParcela = {
  parcelaCodigo: string;
  kgCosechados: number;
  pctExportacion: number;
};

// ---------------------------------------------------------------------------
// Parcelas
// ---------------------------------------------------------------------------

export const PARCELAS: Parcela[] = [
  { codigo: "37A", variedad: "agata", superficieHa: 13 },
  { codigo: "37B", variedad: "agata", superficieHa: 6.48 },
  { codigo: "38", variedad: "asterix", superficieHa: 4.7 },
  { codigo: "41", variedad: "atlantic", superficieHa: 14.3 },
  { codigo: "42", variedad: "atlantic", superficieHa: 12.17 },
  { codigo: "30", variedad: "spunta", superficieHa: 6.9 },
  { codigo: "31", variedad: "spunta", superficieHa: 11.47 },
  { codigo: "32", variedad: "spunta", superficieHa: 14.1 },
  { codigo: "34A", variedad: "spunta", superficieHa: 7.35 },
  { codigo: "35B", variedad: "daifla", superficieHa: 7.3 },
  { codigo: "48", variedad: "kennebec", superficieHa: 0.34 },
  { codigo: "45", variedad: "kelly", superficieHa: 0.44 },
];

// ---------------------------------------------------------------------------
// Insumos
// ---------------------------------------------------------------------------

export const INSUMOS: Insumo[] = [
  // Herbicidas
  { id: "cletodin", marca: "Cletodin", principioActivo: "Quizalofop p-etil", categoria: "Herbicida", precioUsd: 9, dosisHaRecomendada: 2.5 },
  { id: "sencorex", marca: "Sencorex", principioActivo: "Metribuzin pre", categoria: "Herbicida", precioUsd: 18.11, dosisHaRecomendada: 1.5 },
  { id: "reglone", marca: "Reglone", principioActivo: "Bromuro de Diquat", categoria: "Herbicida", precioUsd: 10.41, dosisHaRecomendada: 2 },
  { id: "dual-gold", marca: "Dual Gold", principioActivo: "Metolacloro 96%", categoria: "Herbicida", precioUsd: 7.43, dosisHaRecomendada: 2.5 },
  { id: "gramoxone", marca: "Gramoxone", principioActivo: "Paraquat dicloruro", categoria: "Herbicida", precioUsd: 2.7, dosisHaRecomendada: 2 },
  // Insecticidas
  { id: "engeo", marca: "Engeo", principioActivo: "Tiametoxam 14,1 + Lambdacialotrina 10,6", categoria: "Insecticida", precioUsd: 26.33, dosisHaRecomendada: 0.25 },
  { id: "agrimec", marca: "Agrimec", principioActivo: "Abamectina 8,4", categoria: "Insecticida", precioUsd: 35, dosisHaRecomendada: 0.15 },
  { id: "perfection", marca: "Perfection", principioActivo: "Dimetoato 40%", categoria: "Insecticida", precioUsd: 9.87, dosisHaRecomendada: 0.25 },
  { id: "karate-zeon", marca: "Karate zeon", principioActivo: "Lambdacialotrina", categoria: "Insecticida", precioUsd: 29.9, dosisHaRecomendada: 0.03 },
  { id: "calypso", marca: "Calypso", principioActivo: "Thiacloprid 48", categoria: "Insecticida", precioUsd: 79.8, dosisHaRecomendada: 0.15 },
  { id: "magic", marca: "Magic", principioActivo: "Imidacloprid 10% + Bifentrin 3%", categoria: "Insecticida", precioUsd: 18.6, dosisHaRecomendada: 0.6 },
  // Fungicidas
  { id: "daconil", marca: "Daconil", principioActivo: "Clorotalonil 72% SC", categoria: "Fungicida", precioUsd: 8.16, dosisHaRecomendada: 1.3 },
  { id: "dithane-n80", marca: "Dithane N80", principioActivo: "Mancozeb", categoria: "Fungicida", precioUsd: 6.1, dosisHaRecomendada: 1.5 },
  { id: "ridomil-gold", marca: "Ridomil Gold", principioActivo: "Mancozeb+Metalaxil", categoria: "Fungicida", precioUsd: 34.5, dosisHaRecomendada: 2.5 },
  { id: "aliette", marca: "Aliette", principioActivo: "Fosetil Aluminio 80%", categoria: "Fungicida", precioUsd: 20.14, dosisHaRecomendada: 2 },
  { id: "amistar-top", marca: "Amistar Top", principioActivo: "Azoxistrobina 20 + Difenoconazol 12,5", categoria: "Fungicida", precioUsd: 34.24, dosisHaRecomendada: 0.6 },
];

// ---------------------------------------------------------------------------
// Órdenes de trabajo (cabecera + líneas de insumo)
// ---------------------------------------------------------------------------

export const ORDENES: OrdenTrabajo[] = [
  {
    numero: 1,
    fechaEmision: "2026-11-10T10:00:00",
    fechaTarea: "2026-11-11T07:30:00",
    aplicador: "Daniel",
    herramienta: "Drone",
    parcelaCodigo: "37A",
    estado: "Ejecutada",
    lineas: [
      { insumoId: "dithane-n80", dosisHa: 2.5 },
      { insumoId: "engeo", dosisHa: 0.25 },
    ],
  },
  {
    numero: 2,
    fechaEmision: "2026-10-03T09:15:00",
    fechaTarea: "2026-10-04T06:00:00",
    aplicador: "Martín",
    herramienta: "Pulverizadora",
    parcelaCodigo: "30",
    estado: "Ejecutada",
    lineas: [
      { insumoId: "cletodin", dosisHa: 2.5 },
      { insumoId: "sencorex", dosisHa: 1.5 },
      { insumoId: "gramoxone", dosisHa: 2 },
    ],
  },
  {
    numero: 3,
    fechaEmision: "2026-10-07T11:30:00",
    fechaTarea: "2026-10-08T21:15:00",
    aplicador: "Gustavo",
    herramienta: "Drone",
    parcelaCodigo: "41",
    estado: "Ejecutada",
    lineas: [
      { insumoId: "daconil", dosisHa: 1.3 },
      { insumoId: "ridomil-gold", dosisHa: 2.5 },
    ],
  },
  {
    numero: 4,
    fechaEmision: "2026-10-12T08:45:00",
    fechaTarea: "2026-10-13T06:30:00",
    aplicador: "Daniel",
    herramienta: "Pulverizadora",
    parcelaCodigo: "38",
    estado: "Ejecutada",
    lineas: [
      { insumoId: "reglone", dosisHa: 2 },
      { insumoId: "dual-gold", dosisHa: 2.5 },
    ],
  },
  {
    numero: 5,
    fechaEmision: "2026-10-18T14:00:00",
    fechaTarea: "2026-10-19T21:00:00",
    aplicador: "Martín",
    herramienta: "Drone",
    parcelaCodigo: "42",
    estado: "Ejecutada",
    lineas: [
      { insumoId: "agrimec", dosisHa: 0.15 },
      { insumoId: "karate-zeon", dosisHa: 0.03 },
      { insumoId: "amistar-top", dosisHa: 0.6 },
    ],
  },
  {
    numero: 6,
    fechaEmision: "2026-10-24T10:20:00",
    fechaTarea: "2026-10-25T07:00:00",
    aplicador: "Gustavo",
    herramienta: "Pulverizadora",
    parcelaCodigo: "31",
    estado: "Ejecutada",
    lineas: [
      { insumoId: "perfection", dosisHa: 0.25 },
      { insumoId: "calypso", dosisHa: 0.15 },
    ],
  },
  {
    numero: 7,
    fechaEmision: "2026-11-02T09:00:00",
    fechaTarea: "2026-11-03T06:00:00",
    aplicador: "Daniel",
    herramienta: "Drone",
    parcelaCodigo: "32",
    estado: "Ejecutada",
    lineas: [
      { insumoId: "magic", dosisHa: 0.6 },
      { insumoId: "dithane-n80", dosisHa: 1.5 },
      { insumoId: "aliette", dosisHa: 2 },
    ],
  },
  {
    numero: 8,
    fechaEmision: "2026-11-14T13:10:00",
    fechaTarea: "2026-11-15T21:15:00",
    aplicador: "Martín",
    herramienta: "Pulverizadora",
    parcelaCodigo: "34A",
    estado: "Emitida",
    lineas: [
      { insumoId: "sencorex", dosisHa: 1.5 },
      { insumoId: "ridomil-gold", dosisHa: 2.5 },
    ],
  },
  {
    numero: 9,
    fechaEmision: "2026-11-20T08:30:00",
    fechaTarea: "2026-11-21T06:00:00",
    aplicador: "Gustavo",
    herramienta: "Drone",
    parcelaCodigo: "37B",
    estado: "Emitida",
    lineas: [
      { insumoId: "daconil", dosisHa: 1.3 },
      { insumoId: "amistar-top", dosisHa: 0.6 },
      { insumoId: "agrimec", dosisHa: 0.15 },
    ],
  },
  {
    numero: 10,
    fechaEmision: "2026-11-27T15:45:00",
    fechaTarea: "2026-11-28T21:30:00",
    aplicador: "Daniel",
    herramienta: "Pulverizadora",
    parcelaCodigo: "35B",
    estado: "Emitida",
    lineas: [
      { insumoId: "karate-zeon", dosisHa: 0.03 },
      { insumoId: "perfection", dosisHa: 0.25 },
    ],
  },
  {
    numero: 11,
    fechaEmision: "2026-12-04T09:50:00",
    fechaTarea: "2026-12-05T07:00:00",
    aplicador: "Martín",
    herramienta: "Drone",
    parcelaCodigo: "48",
    estado: "Borrador",
    lineas: [
      { insumoId: "gramoxone", dosisHa: 2 },
      { insumoId: "dual-gold", dosisHa: 2.5 },
    ],
  },
  {
    numero: 12,
    fechaEmision: "2026-12-11T12:00:00",
    fechaTarea: "2026-12-12T21:00:00",
    aplicador: "Gustavo",
    herramienta: "Pulverizadora",
    parcelaCodigo: "45",
    estado: "Borrador",
    lineas: [
      { insumoId: "cletodin", dosisHa: 2.5 },
      { insumoId: "engeo", dosisHa: 0.25 },
      { insumoId: "calypso", dosisHa: 0.15 },
      { insumoId: "magic", dosisHa: 0.6 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Producción por parcela (para indicadores)
// ---------------------------------------------------------------------------

export const PRODUCCION: ProduccionParcela[] = [
  { parcelaCodigo: "37A", kgCosechados: 494000, pctExportacion: 85 },
  { parcelaCodigo: "37B", kgCosechados: 230040, pctExportacion: 82 },
  { parcelaCodigo: "38", kgCosechados: 192700, pctExportacion: 88 },
  { parcelaCodigo: "41", kgCosechados: 471900, pctExportacion: 79 },
  { parcelaCodigo: "42", kgCosechados: 444205, pctExportacion: 84 },
  { parcelaCodigo: "30", kgCosechados: 272550, pctExportacion: 86 },
  { parcelaCodigo: "31", kgCosechados: 355570, pctExportacion: 80 },
  { parcelaCodigo: "32", kgCosechados: 620400, pctExportacion: 90 },
  { parcelaCodigo: "34A", kgCosechados: 249900, pctExportacion: 81 },
  { parcelaCodigo: "35B", kgCosechados: 273750, pctExportacion: 83 },
  { parcelaCodigo: "48", kgCosechados: 14280, pctExportacion: 89 },
  { parcelaCodigo: "45", kgCosechados: 13420, pctExportacion: 78 },
];

// ---------------------------------------------------------------------------
// Derivaciones puras
// ---------------------------------------------------------------------------

export function getParcela(codigo: string): Parcela | undefined {
  return PARCELAS.find((p) => p.codigo === codigo);
}

export function getInsumo(id: string): Insumo | undefined {
  return INSUMOS.find((i) => i.id === id);
}

/** Cantidad total de insumo usada en una línea (unidad × ha de la parcela). */
export function totalUso(linea: LineaOrden, parcela: Parcela): number {
  return linea.dosisHa * parcela.superficieHa;
}

/** Costo en U$S de una línea de orden. */
export function costoLinea(linea: LineaOrden, insumo: Insumo, parcela: Parcela): number {
  return totalUso(linea, parcela) * insumo.precioUsd;
}

/** Costo total en U$S de una orden (suma de sus líneas). Ignora líneas con datos faltantes. */
export function costoOrden(orden: OrdenTrabajo): number {
  const parcela = getParcela(orden.parcelaCodigo);
  if (!parcela) return 0;
  return orden.lineas.reduce((sum, linea) => {
    const insumo = getInsumo(linea.insumoId);
    if (!insumo) return sum;
    return sum + costoLinea(linea, insumo, parcela);
  }, 0);
}

/** Órdenes que corresponden a una parcela dada. */
export function ordenesDeParcela(codigo: string, ordenes: OrdenTrabajo[] = ORDENES): OrdenTrabajo[] {
  return ordenes.filter((o) => o.parcelaCodigo === codigo);
}

/** Costo de insumos por hectárea de una parcela: suma de costos de sus órdenes / superficie. */
export function costoPorHectarea(parcela: Parcela, ordenes: OrdenTrabajo[] = ORDENES): number {
  if (parcela.superficieHa === 0) return 0;
  const total = ordenesDeParcela(parcela.codigo, ordenes).reduce(
    (sum, orden) => sum + costoOrden(orden),
    0,
  );
  return total / parcela.superficieHa;
}

/** kg cosechados por hectárea de una parcela. */
export function rendimiento(produccion: ProduccionParcela, parcela: Parcela): number {
  if (parcela.superficieHa === 0) return 0;
  return produccion.kgCosechados / parcela.superficieHa;
}

export function getProduccion(codigo: string): ProduccionParcela | undefined {
  return PRODUCCION.find((p) => p.parcelaCodigo === codigo);
}

// ---------------------------------------------------------------------------
// Formato es-AR (helpers propios, no se toca app/components/format.ts)
// ---------------------------------------------------------------------------

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function formatUsdDecimal(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}

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

export function formatPct(n: number): string {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n)}%`;
}

export function formatFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
