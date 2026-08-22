"use server";

// Server actions de INDICADORES DE CAMPO (producción, rendimiento, exportación).
// Consumidas directo desde app/indicadores/page.tsx (@/lib/actions/indicadores),
// no via el barrel @/lib/actions.

import {
  calcularIndicadores,
  listarVariedades,
  type ParcelaIndicador,
  type VariedadIndicador,
  type TotalesIndicador,
} from "@/lib/indicadores";

export type { ParcelaIndicador, VariedadIndicador, TotalesIndicador };

export type IndicadoresDTO = {
  porParcela: ParcelaIndicador[];
  porVariedad: VariedadIndicador[];
  totales: TotalesIndicador;
};

export type IndicadoresFiltrosInput = {
  campania?: string;
  variedad?: string;
};

export async function getIndicadores(
  filtros?: IndicadoresFiltrosInput,
): Promise<IndicadoresDTO> {
  return calcularIndicadores(filtros ?? {});
}

export async function getVariedadesIndicadores(): Promise<string[]> {
  return listarVariedades();
}
