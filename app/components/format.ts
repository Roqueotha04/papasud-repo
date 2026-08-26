import type { Categoria, MovementType } from "@/app/generated/prisma/enums";

export const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: "CAMPO_A_FRIO", label: "Campo a frío" },
  { value: "INGRESO_TOLVAS", label: "Ingreso a tolvas" },
  { value: "ENVIO_A_FRIO", label: "Envío a frío" },
  { value: "RETORNO_FRIO", label: "Retorno de frío" },
  { value: "PAPA_CHICA", label: "Papa chica" },
  { value: "INGRESO_TREVELIN", label: "Ingreso a Trevelín" },
  { value: "ENTREGA_CLIENTE", label: "Entrega a cliente" },
];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  CAMPO_A_FRIO: "Campo a frío",
  INGRESO_TOLVAS: "Ingreso a tolvas",
  ENVIO_A_FRIO: "Envío a frío",
  RETORNO_FRIO: "Retorno de frío",
  PAPA_CHICA: "Papa chica",
  INGRESO_TREVELIN: "Ingreso a Trevelín",
  ENTREGA_CLIENTE: "Entrega a cliente",
};

/** Tipos cuyo destino es un cliente: son los únicos donde pedir el nombre del
 *  cliente y el comisionista tiene sentido. */
export const TIPOS_SALIDA_A_CLIENTE: ReadonlySet<MovementType> = new Set([
  "ENTREGA_CLIENTE",
]);

export const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "EXPORTACION", label: "Exportación" },
  { value: "SIN_CHICAS", label: "Sin chicas" },
  { value: "RECIBO", label: "Recibo" },
  { value: "GRANEL", label: "Granel" },
  { value: "DESCARTE_PARAGUAY", label: "Descarte Paraguay" },
  { value: "SOLO_CHASIS", label: "Solo chasis" },
  { value: "SEMILLA", label: "Semilla" },
];

export const CATEGORIA_LABELS: Record<Categoria, string> = {
  EXPORTACION: "Exportación",
  SIN_CHICAS: "Sin chicas",
  RECIBO: "Recibo",
  GRANEL: "Granel",
  DESCARTE_PARAGUAY: "Descarte Paraguay",
  SOLO_CHASIS: "Solo chasis",
  SEMILLA: "Semilla",
};

export function categoriaLabel(categoria: string): string {
  return CATEGORIA_LABELS[categoria as Categoria] ?? categoria;
}

export const VARIEDADES = [
  "agata",
  "spunta",
  "asterix",
  "atlantic",
  "daifla",
  "king russet",
  "memphis",
  "sunred",
  "quintera",
  "sagitta",
  "ludmilla",
  "kennebec",
  "kelly",
  "pampeana",
  "sinatra",
  "markies",
  "ikarus",
  "alverstone",
  "7 four 7",
] as const;

export function formatKg(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatEntero(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

export function formatFecha(iso: string): string {
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

export function movementTypeLabel(tipo: string): string {
  return MOVEMENT_TYPE_LABELS[tipo as MovementType] ?? tipo;
}
