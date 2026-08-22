import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import {
  Categoria,
  GradoSemilla,
  LocationType,
  MovementType,
  Unidad,
} from "../app/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TRANSPORTES = [
  "Serantes-Vera",
  "Camillo (Gastón)",
  "Camillo (Mario)",
  "Arenas (Jaimez)",
  "Arenas (De Grandis)",
  "Cerone (Raphael)",
  "Cerone (Sotelo)",
  "Álvaro Arenas",
] as const;

const COMISIONISTAS = ["S. García", "Coronado", "Pizzuti", "Rastellini"] as const;

const COLORES_BOLSA = ["blanca", "amarilla", "verde", "roja", "azul"] as const;
const COLORES_HILO = ["blanco", "verde", "rojo", "negro", "azul"] as const;
const GRADOS: GradoSemilla[] = [
  GradoSemilla.INICIAL_1,
  GradoSemilla.INICIAL_2,
  GradoSemilla.INICIAL_3,
];

const LOTES_SANTA_ANA: { variedad: string; lote: string }[] = [
  { variedad: "agata", lote: "220" },
  { variedad: "agata", lote: "510" },
  { variedad: "spunta", lote: "235" },
  { variedad: "spunta", lote: "620" },
  { variedad: "asterix", lote: "248" },
  { variedad: "asterix", lote: "540" },
  { variedad: "atlantic", lote: "260" },
  { variedad: "atlantic", lote: "705" },
  { variedad: "daifla", lote: "280" },
  { variedad: "daifla", lote: "750" },
  { variedad: "king russet", lote: "300" },
  { variedad: "king russet", lote: "800" },
  { variedad: "memphis", lote: "320" },
  { variedad: "sunred", lote: "340" },
  { variedad: "ludmilla", lote: "355" },
  { variedad: "kennebec", lote: "880" },
];

const LOTES_TREVELIN: { variedad: string; lote: string }[] = [
  { variedad: "spunta", lote: "2" },
  { variedad: "memphis", lote: "3" },
  { variedad: "kennebec", lote: "5" },
  { variedad: "atlantic", lote: "8" },
  { variedad: "ludmilla", lote: "9" },
  { variedad: "asterix", lote: "11" },
  { variedad: "spunta", lote: "14" },
  { variedad: "daifla", lote: "15" },
  { variedad: "kennebec", lote: "17" },
  { variedad: "agata", lote: "20" },
];

const LOTES_CAMPO_FRIO: { variedad: string; lote: string }[] = [
  { variedad: "agata", lote: "81" },
  { variedad: "spunta", lote: "92" },
  { variedad: "asterix", lote: "104" },
  { variedad: "atlantic", lote: "118" },
  { variedad: "daifla", lote: "125" },
  { variedad: "king russet", lote: "133" },
  { variedad: "memphis", lote: "141" },
  { variedad: "sunred", lote: "152" },
  { variedad: "ludmilla", lote: "160" },
  { variedad: "kennebec", lote: "174" },
];

const CAMPANIA_NOMBRE = "2026";

type ParcelaSeed = {
  variedad: string;
  codigo: string;
  superficieHa: number;
  pivote?: string;
  tercio?: number;
};

// Superficies reales de la planilla del cliente (hoja Stocks) + 3 parcelas
// plausibles para variedades que el seed ya usa pero la planilla no cubre
// (king russet, memphis, sunred).
const PARCELAS: ParcelaSeed[] = [
  { variedad: "agata", codigo: "37A", superficieHa: 13, pivote: "A", tercio: 3 },
  { variedad: "agata", codigo: "37B", superficieHa: 6.48 },
  { variedad: "asterix", codigo: "38", superficieHa: 4.7 },
  { variedad: "atlantic", codigo: "41", superficieHa: 14.3, pivote: "A", tercio: 1 },
  { variedad: "atlantic", codigo: "42", superficieHa: 12.17, pivote: "B", tercio: 1 },
  { variedad: "spunta", codigo: "30", superficieHa: 6.9, pivote: "C", tercio: 3 },
  { variedad: "spunta", codigo: "31", superficieHa: 11.47, pivote: "B", tercio: 2 },
  { variedad: "spunta", codigo: "32", superficieHa: 14.1, pivote: "A", tercio: 2 },
  { variedad: "spunta", codigo: "33", superficieHa: 5.47 },
  { variedad: "spunta", codigo: "34A", superficieHa: 7.35, pivote: "C", tercio: 1 },
  { variedad: "spunta", codigo: "34B", superficieHa: 2.7 },
  { variedad: "daifla", codigo: "35A", superficieHa: 1.05 },
  { variedad: "daifla", codigo: "35B", superficieHa: 7.3, pivote: "C", tercio: 2 },
  { variedad: "ludmilla", codigo: "36", superficieHa: 0.2 },
  { variedad: "pampeana", codigo: "39", superficieHa: 0.2 },
  { variedad: "kennebec", codigo: "48", superficieHa: 0.34 },
  { variedad: "kelly", codigo: "45", superficieHa: 0.44 },
  { variedad: "king russet", codigo: "44", superficieHa: 8, pivote: "B", tercio: 3 },
  { variedad: "memphis", codigo: "46", superficieHa: 5.5 },
  { variedad: "sunred", codigo: "47", superficieHa: 4.2 },
];

type CalibreSeed = { rango: string; pesoKg: number; cantidad: number };

type MuestreoSeed = {
  codigoParcela: string;
  fecha: Date;
  tratamiento?: string;
  pesoTotalKg: number;
  nTuberculos: number;
  tallos?: number;
  tallosPorMetro?: number;
  calibres: CalibreSeed[];
};

// Muestreos pre-cosecha reales (archivo "Muestras pre-cosecha Oriente 2020.xlsx").
const MUESTREOS: MuestreoSeed[] = [
  {
    codigoParcela: "41",
    fecha: utcDate(2026, 6, 22),
    tratamiento: "Rootex",
    pesoTotalKg: 10.24,
    nTuberculos: 171,
    tallos: 68,
    calibres: [
      { rango: ">60", pesoKg: 0, cantidad: 0 },
      { rango: "55-60", pesoKg: 2.34, cantidad: 19 },
      { rango: "40-55", pesoKg: 6.7, cantidad: 106 },
      { rango: "30-40", pesoKg: 1.0, cantidad: 31 },
      { rango: "<30", pesoKg: 0.2, cantidad: 15 },
    ],
  },
  {
    codigoParcela: "41",
    fecha: utcDate(2026, 6, 22),
    tratamiento: "S/Rootex",
    pesoTotalKg: 9.133,
    nTuberculos: 152,
    calibres: [
      { rango: ">60", pesoKg: 0.4, cantidad: 2 },
      { rango: "55-60", pesoKg: 2.3, cantidad: 20 },
      { rango: "40-55", pesoKg: 5.093, cantidad: 76 },
      { rango: "30-40", pesoKg: 0.99, cantidad: 30 },
      { rango: "<30", pesoKg: 0.35, cantidad: 24 },
    ],
  },
  {
    codigoParcela: "38",
    fecha: utcDate(2026, 6, 22),
    tratamiento: "Rootex",
    pesoTotalKg: 10.596,
    nTuberculos: 206,
    tallos: 88,
    calibres: [
      { rango: ">55", pesoKg: 1.349, cantidad: 13 },
      { rango: "45-55", pesoKg: 7.567, cantidad: 128 },
      { rango: "25-45", pesoKg: 1.48, cantidad: 50 },
      { rango: "<25", pesoKg: 0.2, cantidad: 15 },
    ],
  },
  {
    codigoParcela: "38",
    fecha: utcDate(2026, 6, 22),
    tratamiento: "S/Rootex",
    pesoTotalKg: 11.681,
    nTuberculos: 200,
    calibres: [
      { rango: ">55", pesoKg: 2.54, cantidad: 19 },
      { rango: "45-55", pesoKg: 4.59, cantidad: 57 },
      { rango: "25-45", pesoKg: 4.371, cantidad: 110 },
      { rango: "<25", pesoKg: 0.18, cantidad: 14 },
    ],
  },
  {
    codigoParcela: "37A",
    fecha: utcDate(2026, 6, 22),
    tratamiento: "Rootex",
    pesoTotalKg: 12.995,
    nTuberculos: 215,
    tallos: 83,
    tallosPorMetro: 24.92,
    calibres: [
      { rango: "55-60", pesoKg: 0.717, cantidad: 4 },
      { rango: "50-55", pesoKg: 3.82, cantidad: 34 },
      { rango: "45-50", pesoKg: 4.9, cantidad: 61 },
      { rango: "40-45", pesoKg: 2.197, cantidad: 48 },
      { rango: "25-40", pesoKg: 0.65, cantidad: 21 },
      { rango: "<25", pesoKg: 0.711, cantidad: 47 },
    ],
  },
  {
    codigoParcela: "37A",
    fecha: utcDate(2026, 6, 22),
    tratamiento: "S/Rootex",
    pesoTotalKg: 13.21,
    nTuberculos: 197,
    calibres: [
      { rango: "55-60", pesoKg: 1.48, cantidad: 6 },
      { rango: "50-55", pesoKg: 4.8, cantidad: 46 },
      { rango: "45-50", pesoKg: 3.0, cantidad: 40 },
      { rango: "40-45", pesoKg: 2.8, cantidad: 50 },
      { rango: "25-40", pesoKg: 0.95, cantidad: 26 },
      { rango: "<25", pesoKg: 0.18, cantidad: 29 },
    ],
  },
];

const INGRESO_TIPOS = new Set<MovementType>([
  MovementType.INGRESO_TOLVAS,
  MovementType.INGRESO_TREVELIN,
  MovementType.CAMPO_A_FRIO,
]);

type DraftItem = {
  variedad: string;
  lote: string;
  categoria?: Categoria;
  unidad: Unidad;
  bolsas?: number;
  kg: number;
  kgPromedio?: number;
  colorBolsa?: string;
  colorHilo?: string;
  gradoSemilla?: GradoSemilla;
};

type DraftMov = {
  remito: string;
  fecha: Date;
  tipo: MovementType;
  transporte?: string;
  cliente?: string;
  comisionista?: string;
  dtv?: string;
  observaciones?: string;
  origenId: string;
  destinoId: string;
  items: DraftItem[];
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260822);

function randInt(min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}

function utcDate(y: number, m: number, d: number, h = 8, min = 0) {
  return new Date(Date.UTC(y, m - 1, d, h, min, 0));
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function clampDate(value: Date, min: Date, max: Date) {
  if (value < min) return new Date(min);
  if (value > max) return new Date(max);
  return value;
}

function qty(maxKg = 43000) {
  const ceiling = Math.max(5000, Math.min(43000, Math.floor(maxKg)));
  const kg = randInt(5000, ceiling);
  const kgPromedio = Math.round((48 + rng() * 6) * 10) / 10;
  const bolsas = Math.round(kg / kgPromedio);
  return { kg, kgPromedio, bolsas };
}

function stockKey(locId: string, variedad: string, lote: string) {
  return `${locId}|${variedad}|${lote}`;
}

function parseKey(key: string) {
  const [locId, variedad, lote] = key.split("|");
  return { locId, variedad, lote };
}

function maybeDtv() {
  if (rng() > 0.22) return undefined;
  return `1334${String(randInt(1000, 9999))}-${randInt(1, 9)}`;
}

function seedAttrs() {
  return {
    gradoSemilla: pick(GRADOS),
    colorBolsa: pick(COLORES_BOLSA),
    colorHilo: pick(COLORES_HILO),
  };
}

function categoriaIngresoTolvas(): { categoria: Categoria; unidad: Unidad } {
  return {
    categoria: Categoria.GRANEL,
    unidad: pick([Unidad.GRANEL, Unidad.GRANEL_CHASIS, Unidad.GRANEL_ACOPLADO]),
  };
}

function categoriaEnvioFrio(): Categoria {
  return pick([Categoria.EXPORTACION, Categoria.SIN_CHICAS]);
}

function categoriaEntrega(): Categoria {
  return pick([
    Categoria.EXPORTACION,
    Categoria.SIN_CHICAS,
    Categoria.RECIBO,
    Categoria.SOLO_CHASIS,
  ]);
}

class StockLedger {
  private kg = new Map<string, number>();
  private last = new Map<string, Date>();

  get(locId: string, variedad: string, lote: string) {
    return this.kg.get(stockKey(locId, variedad, lote)) ?? 0;
  }

  lastAt(locId: string, variedad: string, lote: string) {
    return this.last.get(stockKey(locId, variedad, lote));
  }

  add(locId: string, variedad: string, lote: string, amount: number, fecha: Date) {
    const key = stockKey(locId, variedad, lote);
    this.kg.set(key, (this.kg.get(key) ?? 0) + amount);
    const prev = this.last.get(key);
    if (!prev || fecha > prev) this.last.set(key, fecha);
  }

  consume(locId: string, variedad: string, lote: string, amount: number, fecha: Date) {
    const key = stockKey(locId, variedad, lote);
    this.kg.set(key, (this.kg.get(key) ?? 0) - amount);
    const prev = this.last.get(key);
    if (!prev || fecha > prev) this.last.set(key, fecha);
  }

  keysAt(locId: string, minKg = 5000) {
    const rows: { variedad: string; lote: string; kg: number }[] = [];
    for (const [key, amount] of this.kg) {
      if (!key.startsWith(`${locId}|`) || amount < minKg) continue;
      const { variedad, lote } = parseKey(key);
      rows.push({ variedad, lote, kg: amount });
    }
    return rows;
  }

  earliestLast(locId: string, items: { variedad: string; lote: string }[]) {
    let latest: Date | undefined;
    for (const item of items) {
      const at = this.lastAt(locId, item.variedad, item.lote);
      if (at && (!latest || at > latest)) latest = at;
    }
    return latest;
  }
}

function takeLines(
  ledger: StockLedger,
  originId: string,
  lineCount: number,
  extra?: Partial<DraftItem>,
): DraftItem[] | null {
  const pool = ledger.keysAt(originId, 5000);
  if (pool.length === 0) return null;
  const shuffled = [...pool].sort(() => rng() - 0.5);
  const chosen = shuffled.slice(0, Math.min(lineCount, shuffled.length));
  return chosen.map((row) => {
    const taken = qty(Math.min(43000, row.kg));
    return {
      variedad: row.variedad,
      lote: row.lote,
      unidad: extra?.unidad ?? Unidad.BOLSA,
      categoria: extra?.categoria,
      ...taken,
      colorBolsa: extra?.colorBolsa,
      colorHilo: extra?.colorHilo,
      gradoSemilla: extra?.gradoSemilla,
    };
  });
}

function lineCount() {
  if (rng() > 0.3) return 1;
  return rng() < 0.55 ? 2 : 3;
}

function fechaEnRango(min: Date, max: Date, after?: Date) {
  const start = after ? addDays(after, 1) : min;
  const lo = start > min ? start : min;
  if (lo > max) return max;
  const span = Math.max(
    0,
    Math.floor((max.getTime() - lo.getTime()) / 86_400_000),
  );
  const d = addDays(lo, randInt(0, span));
  d.setUTCHours(randInt(7, 17), randInt(0, 59), 0, 0);
  return clampDate(d, lo, max);
}

async function main() {
  await prisma.muestreoCalibre.deleteMany();
  await prisma.muestreo.deleteMany();
  await prisma.stockCount.deleteMany();
  await prisma.movementItem.deleteMany();
  await prisma.movement.deleteMany();
  await prisma.location.deleteMany();
  await prisma.parcela.deleteMany();
  await prisma.campania.deleteMany();

  const campania = await prisma.campania.create({
    data: {
      nombre: CAMPANIA_NOMBRE,
      desde: utcDate(2026, 2, 1),
      hasta: utcDate(2026, 12, 31),
    },
  });

  const parcelas = await prisma.parcela.createManyAndReturn({
    data: PARCELAS.map((p) => ({
      codigo: p.codigo,
      pivote: p.pivote,
      tercio: p.tercio,
      superficieHa: p.superficieHa,
      variedad: p.variedad,
      campaniaId: campania.id,
    })),
  });

  const parcelaByCodigo = new Map(parcelas.map((p) => [p.codigo, p]));
  const parcelasByVariedad = new Map<string, { id: string; superficieHa: number }[]>();
  for (const p of parcelas) {
    const arr = parcelasByVariedad.get(p.variedad) ?? [];
    arr.push({ id: p.id, superficieHa: p.superficieHa });
    parcelasByVariedad.set(p.variedad, arr);
  }

  const locations = await prisma.location.createManyAndReturn({
    data: [
      { nombre: "Campo", tipo: LocationType.CAMPO, esPropia: false },
      { nombre: "Santa Ana", tipo: LocationType.PLANTA, esPropia: true },
      { nombre: "Galpón", tipo: LocationType.GALPON, esPropia: true },
      { nombre: "Dospanca", tipo: LocationType.FRIGORIFICO, esPropia: true },
      { nombre: "Trevelín", tipo: LocationType.PLANTA, esPropia: true },
      { nombre: "Frigopap", tipo: LocationType.FRIGORIFICO, esPropia: false },
      { nombre: "Sasula", tipo: LocationType.FRIGORIFICO, esPropia: false },
      { nombre: "Cecive", tipo: LocationType.FRIGORIFICO, esPropia: false },
      { nombre: "Parmentier", tipo: LocationType.CLIENTE, esPropia: false },
      { nombre: "McCain-Wemar", tipo: LocationType.CLIENTE, esPropia: false },
      { nombre: "La Unión del Sur", tipo: LocationType.CLIENTE, esPropia: false },
      { nombre: "Agro Selmi", tipo: LocationType.CLIENTE, esPropia: false },
    ],
  });

  const loc = new Map(locations.map((l) => [l.nombre, l.id]));
  const id = (nombre: string) => {
    const value = loc.get(nombre);
    if (!value) throw new Error(`Ubicación no sembrada: ${nombre}`);
    return value;
  };

  const campo = id("Campo");
  const santaAna = id("Santa Ana");
  const galpon = id("Galpón");
  const dospanca = id("Dospanca");
  const trevelin = id("Trevelín");
  const frigopap = id("Frigopap");
  const sasula = id("Sasula");
  const cecive = id("Cecive");
  const clientes = [
    { nombre: "Parmentier", id: id("Parmentier") },
    { nombre: "McCain-Wemar", id: id("McCain-Wemar") },
    { nombre: "La Unión del Sur", id: id("La Unión del Sur") },
    { nombre: "Agro Selmi", id: id("Agro Selmi") },
  ];

  const ledger = new StockLedger();
  const drafts: DraftMov[] = [];
  let remitoN = 1;
  const remito = () => `R-${String(remitoN++).padStart(4, "0")}`;

  const applyIngreso = (mov: DraftMov) => {
    for (const item of mov.items) {
      ledger.add(mov.destinoId, item.variedad, item.lote, item.kg, mov.fecha);
    }
    drafts.push(mov);
  };

  const applyTraslado = (mov: DraftMov) => {
    for (const item of mov.items) {
      const disponible = ledger.get(mov.origenId, item.variedad, item.lote);
      if (disponible < item.kg) {
        if (disponible < 5000) return false;
        item.kg = Math.floor(disponible);
        item.kgPromedio = item.kgPromedio ?? 50;
        item.bolsas = Math.round(item.kg / item.kgPromedio);
      }
      ledger.consume(mov.origenId, item.variedad, item.lote, item.kg, mov.fecha);
      ledger.add(mov.destinoId, item.variedad, item.lote, item.kg, mov.fecha);
    }
    drafts.push(mov);
    return true;
  };

  const ING_MIN = utcDate(2026, 2, 1);
  const ING_MAX = utcDate(2026, 4, 18);
  const INT_MIN = utcDate(2026, 3, 8);
  const INT_MAX = utcDate(2026, 6, 5);
  const SAL_MIN = utcDate(2026, 4, 20);
  const SAL_MAX = utcDate(2026, 7, 28);

  // 1) Ingresos: suman stock en destino
  for (let i = 0; i < 52; i++) {
    const n = lineCount();
    const pairs = [...LOTES_SANTA_ANA].sort(() => rng() - 0.5).slice(0, n);
    const fecha = fechaEnRango(ING_MIN, ING_MAX);
    const cat = categoriaIngresoTolvas();
    applyIngreso({
      remito: remito(),
      fecha,
      tipo: MovementType.INGRESO_TOLVAS,
      transporte: pick(TRANSPORTES),
      dtv: maybeDtv(),
      origenId: campo,
      destinoId: santaAna,
      items: pairs.map((p) => ({
        ...p,
        ...qty(),
        categoria: cat.categoria,
        unidad: cat.unidad,
      })),
    });
  }

  for (let i = 0; i < 24; i++) {
    const n = lineCount();
    const pairs = [...LOTES_TREVELIN].sort(() => rng() - 0.5).slice(0, n);
    const fecha = fechaEnRango(ING_MIN, ING_MAX);
    applyIngreso({
      remito: remito(),
      fecha,
      tipo: MovementType.INGRESO_TREVELIN,
      transporte: pick(TRANSPORTES),
      dtv: maybeDtv(),
      origenId: campo,
      destinoId: trevelin,
      items: pairs.map((p) => ({
        ...p,
        ...qty(),
        categoria: Categoria.SEMILLA,
        unidad: Unidad.BOLSA,
        ...seedAttrs(),
      })),
    });
  }

  for (let i = 0; i < 26; i++) {
    const n = lineCount();
    const pairs = [...LOTES_CAMPO_FRIO].sort(() => rng() - 0.5).slice(0, n);
    const dest = pick([dospanca, galpon]);
    const fecha = fechaEnRango(ING_MIN, ING_MAX);
    applyIngreso({
      remito: remito(),
      fecha,
      tipo: MovementType.CAMPO_A_FRIO,
      transporte: pick(TRANSPORTES),
      dtv: maybeDtv(),
      origenId: campo,
      destinoId: dest,
      items: pairs.map((p) => ({
        ...p,
        ...qty(),
        categoria: pick([Categoria.GRANEL, Categoria.RECIBO]),
        unidad: pick([Unidad.GRANEL_ACOPLADO, Unidad.BOLSA]),
      })),
    });
  }

  // 2) Internos: restan origen, suman destino, siempre ≤ disponible
  for (let i = 0; i < 42; i++) {
    const items = takeLines(ledger, santaAna, lineCount(), {
      categoria: categoriaEnvioFrio(),
      unidad: Unidad.BOLSA,
    });
    if (!items) continue;
    const dest = pick([dospanca, galpon, cecive]);
    const after = ledger.earliestLast(santaAna, items);
    const fecha = fechaEnRango(INT_MIN, INT_MAX, after);
    applyTraslado({
      remito: remito(),
      fecha,
      tipo: MovementType.ENVIO_A_FRIO,
      transporte: pick(TRANSPORTES),
      dtv: maybeDtv(),
      origenId: santaAna,
      destinoId: dest,
      items,
    });
  }

  for (let i = 0; i < 24; i++) {
    const origen = pick([dospanca, cecive]);
    const items = takeLines(ledger, origen, lineCount(), {
      categoria: pick([Categoria.RECIBO, Categoria.SIN_CHICAS]),
      unidad: Unidad.BOLSA,
    });
    if (!items) continue;
    const after = ledger.earliestLast(origen, items);
    const fecha = fechaEnRango(INT_MIN, INT_MAX, after);
    applyTraslado({
      remito: remito(),
      fecha,
      tipo: MovementType.RETORNO_FRIO,
      transporte: pick(TRANSPORTES),
      dtv: maybeDtv(),
      origenId: origen,
      destinoId: pick([galpon, santaAna]),
      items,
    });
  }

  // 3) Salidas al final
  for (let i = 0; i < 18; i++) {
    const origen = pick([santaAna, galpon]);
    const items = takeLines(ledger, origen, lineCount(), {
      categoria: Categoria.DESCARTE_PARAGUAY,
      unidad: pick([Unidad.BOLSA, Unidad.GRANEL]),
    });
    if (!items) continue;
    const after = ledger.earliestLast(origen, items);
    const fecha = fechaEnRango(SAL_MIN, SAL_MAX, after);
    applyTraslado({
      remito: remito(),
      fecha,
      tipo: MovementType.PAPA_CHICA,
      transporte: pick(TRANSPORTES),
      dtv: maybeDtv(),
      observaciones: "papa chica / descarte de calibre",
      origenId: origen,
      destinoId: pick([frigopap, sasula]),
      items,
    });
  }

  for (let i = 0; i < 48; i++) {
    const origenNombre = pick(["Santa Ana", "Galpón", "Dospanca", "Trevelín"]);
    const origenId = id(origenNombre);
    const seed = origenNombre === "Trevelín" ? seedAttrs() : undefined;
    const items = takeLines(ledger, origenId, lineCount(), {
      categoria:
        origenNombre === "Trevelín" ? Categoria.SEMILLA : categoriaEntrega(),
      unidad: Unidad.BOLSA,
      ...seed,
    });
    if (!items) continue;
    if (origenNombre === "Trevelín") {
      for (const item of items) {
        item.categoria = Categoria.SEMILLA;
        Object.assign(item, seedAttrs());
      }
    }
    const cliente = pick(clientes);
    const after = ledger.earliestLast(origenId, items);
    const fecha = fechaEnRango(SAL_MIN, SAL_MAX, after);
    applyTraslado({
      remito: remito(),
      fecha,
      tipo: MovementType.ENTREGA_CLIENTE,
      transporte: pick(TRANSPORTES),
      cliente: cliente.nombre,
      comisionista: rng() < 0.35 ? pick(COMISIONISTAS) : undefined,
      dtv: maybeDtv(),
      origenId,
      destinoId: cliente.id,
      items,
    });
  }

  // 4) Discrepancias plantadas (rompen la regla de oro a propósito)
  drafts.push({
    remito: remito(),
    fecha: utcDate(2026, 7, 12, 11, 20),
    tipo: MovementType.ENTREGA_CLIENTE,
    transporte: pick(TRANSPORTES),
    cliente: "Parmentier",
    dtv: "13348821-3",
    observaciones:
      "posible falta de registro en destino — sale de Dospanca lote 999 y no figura ingreso espejo",
    origenId: dospanca,
    destinoId: id("Parmentier"),
    items: [
      {
        variedad: "sunred",
        lote: "999",
        categoria: Categoria.EXPORTACION,
        unidad: Unidad.BOLSA,
        ...qty(18000),
      },
    ],
  });

  const saRows = ledger.keysAt(santaAna, 8000);
  const unbalanced = saRows[0] ?? {
    variedad: "spunta",
    lote: "235",
    kg: 12000,
  };
  drafts.push({
    remito: remito(),
    fecha: utcDate(2026, 7, 18, 15, 40),
    tipo: MovementType.ENVIO_A_FRIO,
    transporte: pick(TRANSPORTES),
    dtv: "13349002-7",
    observaciones:
      "kg desbalanceado respecto del lote, posible error de pesaje en planta",
    origenId: santaAna,
    destinoId: dospanca,
    items: [
      {
        variedad: unbalanced.variedad,
        lote: unbalanced.lote,
        categoria: Categoria.EXPORTACION,
        unidad: Unidad.BOLSA,
        kg: unbalanced.kg + 16000,
        kgPromedio: 50,
        bolsas: 180,
      },
    ],
  });

  const CHUNK = 25;
  const ingresoLinks: { movementId: string; variedad: string; kg: number }[] = [];
  for (let i = 0; i < drafts.length; i += CHUNK) {
    const chunk = drafts.slice(i, i + CHUNK);
    const results = await prisma.$transaction(
      chunk.map((m) =>
        prisma.movement.create({
          data: {
            remito: m.remito,
            fecha: m.fecha,
            tipo: m.tipo,
            transporte: m.transporte,
            cliente: m.cliente,
            comisionista: m.comisionista,
            dtv: m.dtv,
            observaciones: m.observaciones,
            origenId: m.origenId,
            destinoId: m.destinoId,
            items: { create: m.items },
          },
        }),
      ),
      { timeout: 60_000 },
    );
    results.forEach((created, idx) => {
      const draft = chunk[idx]!;
      if (INGRESO_TIPOS.has(draft.tipo) && draft.items[0]) {
        const kg = draft.items.reduce((s, it) => s + it.kg, 0);
        ingresoLinks.push({ movementId: created.id, variedad: draft.items[0].variedad, kg });
      }
    });
  }

  // Backfill de Movement.parcelaId: solo ingresos desde campo. Cuando una
  // variedad tiene varias parcelas, se reparte con un criterio "greedy": cada
  // movimiento va a la parcela con menor kg/ha acumulado hasta ese momento,
  // para que el rendimiento quede parejo entre parcelas de la misma variedad
  // en vez de depender de la varianza de un sorteo aleatorio con pocas
  // muestras. Se aplica con un updateMany por parcela resultante — nada de
  // awaits uno por uno.
  const kgAcumByParcela = new Map<string, number>();
  function pickParcelaBalanceada(variedad: string): string | null {
    const opciones = parcelasByVariedad.get(variedad);
    if (!opciones || opciones.length === 0) return null;
    let mejor = opciones[0]!;
    let mejorRatio = (kgAcumByParcela.get(mejor.id) ?? 0) / mejor.superficieHa;
    for (const o of opciones.slice(1)) {
      const ratio = (kgAcumByParcela.get(o.id) ?? 0) / o.superficieHa;
      if (ratio < mejorRatio) {
        mejor = o;
        mejorRatio = ratio;
      }
    }
    return mejor.id;
  }

  // Techo de capacidad por variedad = superficie total de sus parcelas × un
  // rendimiento plausible (banda real 25.000-50.000 kg/ha). Los movimientos de
  // depósito (220/510/etc.) no fueron generados pensando en hectáreas reales,
  // así que sin este techo una variedad con poca superficie real pero mucho
  // movimiento de depósito (p. ej. ludmilla 0.2ha, kennebec 0.34ha) termina con
  // rendimientos absurdos. Los movimientos que exceden el techo de su variedad
  // quedan sin parcelaId (no se inventa una parcela ficticia para forzarlos).
  const CAP_KG_POR_HA = 45_000;
  const capacidadByVariedad = new Map<string, number>();
  for (const [variedad, opciones] of parcelasByVariedad) {
    const areaTotal = opciones.reduce((s, o) => s + o.superficieHa, 0);
    capacidadByVariedad.set(variedad, areaTotal * CAP_KG_POR_HA);
  }

  // Se agrupa por variedad y, DENTRO de cada variedad, se ordenan sus
  // movimientos de menor a mayor kg antes de sumarlos contra el techo: así
  // entran varios movimientos chicos en vez de que uno solo grande (hasta
  // 43.000 kg) vuele el techo de una parcela chica de una sola pasada.
  const linksByVariedad = new Map<string, typeof ingresoLinks>();
  for (const link of ingresoLinks) {
    const arr = linksByVariedad.get(link.variedad) ?? [];
    arr.push(link);
    linksByVariedad.set(link.variedad, arr);
  }

  const TOLERANCIA = 1.1; // margen sobre el techo para no cortar de más
  const movementIdsByParcela = new Map<string, string[]>();
  for (const [variedad, links] of linksByVariedad) {
    const cap = capacidadByVariedad.get(variedad);
    if (cap === undefined) continue; // variedad sin parcela: se deja null, no rompe
    const ordenados = [...links].sort((a, b) => a.kg - b.kg);
    let acum = 0;
    for (const link of ordenados) {
      if (acum + link.kg > cap * TOLERANCIA) continue; // rompería el rendimiento plausible
      const parcelaId = pickParcelaBalanceada(variedad);
      if (!parcelaId) continue;
      acum += link.kg;
      kgAcumByParcela.set(parcelaId, (kgAcumByParcela.get(parcelaId) ?? 0) + link.kg);
      const arr = movementIdsByParcela.get(parcelaId) ?? [];
      arr.push(link.movementId);
      movementIdsByParcela.set(parcelaId, arr);
    }
  }

  await Promise.all(
    [...movementIdsByParcela.entries()].map(([parcelaId, movementIds]) =>
      prisma.movement.updateMany({
        where: { id: { in: movementIds } },
        data: { parcelaId },
      }),
    ),
  );

  // 6) Muestreos pre-cosecha
  for (const m of MUESTREOS) {
    const parcela = parcelaByCodigo.get(m.codigoParcela);
    if (!parcela) throw new Error(`Parcela no sembrada: ${m.codigoParcela}`);
    await prisma.muestreo.create({
      data: {
        parcelaId: parcela.id,
        fecha: m.fecha,
        tratamiento: m.tratamiento,
        pesoTotalKg: m.pesoTotalKg,
        nTuberculos: m.nTuberculos,
        tallos: m.tallos,
        tallosPorMetro: m.tallosPorMetro,
        calibres: {
          create: m.calibres.map((c, idx) => ({
            rango: c.rango,
            ordenRango: idx,
            pesoKg: c.pesoKg,
            cantidad: c.cantidad,
          })),
        },
      },
    });
  }

  // 5) Conteos físicos (StockCount): calculados CONTRA EL STOCK DERIVADO REAL,
  // después de haber creado todos los movimientos, igual que hace lib/stock.ts.
  const propias = new Set(["Dospanca", "Galpón", "Santa Ana", "Trevelín"]);
  const nombreById = new Map(locations.map((l) => [l.id, l.nombre]));

  const allItems = await prisma.movementItem.findMany({
    select: {
      variedad: true,
      lote: true,
      kg: true,
      movement: { select: { origenId: true, destinoId: true } },
    },
  });

  const derived = new Map<string, number>();
  for (const item of allItems) {
    const destKey = stockKey(item.movement.destinoId, item.variedad, item.lote);
    derived.set(destKey, (derived.get(destKey) ?? 0) + item.kg);
    const origKey = stockKey(item.movement.origenId, item.variedad, item.lote);
    derived.set(origKey, (derived.get(origKey) ?? 0) - item.kg);
  }

  const candidatas: { locationId: string; variedad: string; lote: string; kg: number }[] = [];
  for (const [key, kg] of derived) {
    if (kg <= 0) continue;
    const { locId, variedad, lote } = parseKey(key);
    if (!locId || !variedad || !lote) continue;
    const nombre = nombreById.get(locId);
    if (!nombre || !propias.has(nombre)) continue;
    candidatas.push({ locationId: locId, variedad, lote, kg });
  }
  candidatas.sort((a, b) => stockKey(a.locationId, a.variedad, a.lote).localeCompare(
    stockKey(b.locationId, b.variedad, b.lote),
  ));
  const elegidas = candidatas.slice(0, 10);

  const fechaConteo = utcDate(2026, 7, 25, 9, 0);
  const stockCountData = elegidas.map((fila, i) => {
    let kgContado = fila.kg;
    if (i === 8) kgContado = fila.kg - 2400;
    if (i === 9) kgContado = fila.kg + 1800;
    return {
      fecha: fechaConteo,
      variedad: fila.variedad,
      lote: fila.lote,
      kgContado,
      locationId: fila.locationId,
    };
  });
  await prisma.stockCount.createMany({ data: stockCountData });

  const [locs, movs, items, stockCounts, campanias, parcelasCount, movsConParcela, muestreos, calibres] =
    await Promise.all([
      prisma.location.count(),
      prisma.movement.count(),
      prisma.movementItem.count(),
      prisma.stockCount.count(),
      prisma.campania.count(),
      prisma.parcela.count(),
      prisma.movement.count({ where: { parcelaId: { not: null } } }),
      prisma.muestreo.count(),
      prisma.muestreoCalibre.count(),
    ]);
  console.log({
    locs,
    movs,
    items,
    stockCounts,
    campanias,
    parcelas: parcelasCount,
    movsConParcela,
    muestreos,
    calibres,
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
