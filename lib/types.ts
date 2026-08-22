// Contrato compartido entre backend y frontend. NO cambiar las firmas sin coordinar.
import type {
  LocationType,
  MovementType,
  Categoria,
  Unidad,
} from "@/app/generated/prisma/enums";

export type LocationDTO = {
  id: string;
  nombre: string;
  tipo: LocationType;
  esPropia: boolean;
};

// Una fila de stock derivado: cuánto hay de una variedad/lote en una ubicación.
export type StockRow = {
  variedad: string;
  lote: string;
  kg: number;
  bolsas: number;
};

export type StockPorUbicacion = {
  location: LocationDTO;
  totalKg: number;
  totalBolsas: number;
  rows: StockRow[];
};

export type MovementItemInput = {
  variedad: string;
  lote: string;
  categoria?: Categoria | null;
  unidad?: Unidad;
  bolsas?: number | null;
  kg: number;
  kgPromedio?: number | null;
};

export type MovementInput = {
  tipo: MovementType;
  fecha?: string; // ISO. Si falta, se usa ahora.
  remito?: string | null;
  origenId: string;
  destinoId: string;
  transporte?: string | null;
  cliente?: string | null;
  comisionista?: string | null;
  observaciones?: string | null;
  rawInput?: string | null;
  parseadoPorIa?: boolean;
  items: MovementItemInput[];
};

export type RegistrarResult =
  | { ok: true; movementId: string }
  | { ok: false; error: string };

export type MovimientoDTO = {
  id: string;
  remito: string | null;
  fecha: string;
  tipo: MovementType;
  origen: string;
  destino: string;
  transporte: string | null;
  cliente: string | null;
  items: {
    variedad: string;
    lote: string;
    kg: number;
    bolsas: number | null;
    categoria: Categoria | null;
  }[];
};

// Diferencia entre stock esperado (derivado de movimientos) y contado.
export type Discrepancia = {
  locationId: string;
  locationNombre: string;
  variedad: string;
  lote: string;
  esperadoKg: number;
  contadoKg: number;
  diffKg: number;
  hipotesis?: string | null;
};
