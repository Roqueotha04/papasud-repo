// Agrupación de movimientos por día. La comparte la vista de /movimientos y la
// exportación a Excel para que la pantalla y el archivo cuenten lo mismo: un
// remito es de un día, y el día es la unidad con la que se controla el
// depósito ("¿qué se movió el martes?"), no el mes ni el remito suelto.
//
// Sin dependencias de Prisma ni de React: la importan un componente cliente y
// un route handler.

import type { MovimientoDTO } from "@/lib/types";

export type DiaMovimientos = {
  /** yyyy-mm-dd, sirve como clave estable y como orden. */
  dia: string;
  /** "martes 14 de abril de 2026", ya capitalizado. */
  etiqueta: string;
  movimientos: MovimientoDTO[];
  totalKg: number;
  totalBolsas: number;
  /** Remitos distintos del día. Igual a movimientos.length, explicitado. */
  remitos: number;
};

/** Kilos totales de un movimiento, sumando todas sus líneas. */
export function kgDeMovimiento(mov: MovimientoDTO): number {
  return mov.items.reduce((sum, item) => sum + item.kg, 0);
}

/** Bolsas totales de un movimiento. Las líneas a granel no suman. */
export function bolsasDeMovimiento(mov: MovimientoDTO): number {
  return mov.items.reduce((sum, item) => sum + (item.bolsas ?? 0), 0);
}

/**
 * Toma la fecha en la zona horaria local del servidor. Las fechas se guardan
 * en UTC a las 8-18 h, así que en Argentina (UTC-3) el día calendario no se
 * corre; usar el ISO crudo sí lo correría en los movimientos de la mañana
 * temprano.
 */
function claveDia(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function etiquetaDia(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Agrupa por día calendario, del más reciente al más viejo. Dentro de cada día
 * los movimientos quedan ordenados por hora descendente.
 */
export function agruparPorFecha(movimientos: MovimientoDTO[]): DiaMovimientos[] {
  const porDia = new Map<string, MovimientoDTO[]>();

  for (const mov of movimientos) {
    const dia = claveDia(mov.fecha);
    const lista = porDia.get(dia);
    if (lista) lista.push(mov);
    else porDia.set(dia, [mov]);
  }

  return [...porDia.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dia, lista]) => {
      const ordenados = [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha));
      return {
        dia,
        etiqueta: etiquetaDia(ordenados[0]!.fecha),
        movimientos: ordenados,
        totalKg: ordenados.reduce((s, m) => s + kgDeMovimiento(m), 0),
        totalBolsas: ordenados.reduce((s, m) => s + bolsasDeMovimiento(m), 0),
        remitos: ordenados.length,
      };
    });
}
