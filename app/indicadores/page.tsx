import { CostoPorCategoriaTable } from "@/app/components/CostoPorCategoriaTable";
import { CostoPorParcelaTable } from "@/app/components/CostoPorParcelaTable";
import { ExportLink } from "@/app/components/ExportLink";
import { IndicadoresFiltros } from "@/app/components/IndicadoresFiltros";
import { IndicadoresTable } from "@/app/components/IndicadoresTable";
import {
  EmptyState,
  PageHeader,
  Section,
  TableCard,
  type Stat,
} from "@/app/components/Page";
import { getCampanias } from "@/lib/actions/altas";
import {
  getIndicadores,
  getVariedadesIndicadores,
} from "@/lib/actions/indicadores";
import { formatHa, formatNumero, formatPct } from "@/lib/indicadores";
import { formatUsd, getResumenOrdenes } from "@/lib/ordenes";

type SearchParams = Promise<{
  variedad?: string | string[];
  campania?: string | string[];
}>;

/** Un parámetro repetido en la URL llega como array; vale el primero. */
function primerValor(valor: string | string[] | undefined): string | undefined {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  return crudo?.trim() || undefined;
}

export default async function IndicadoresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const variedad = primerValor(params.variedad);
  const campania = primerValor(params.campania);

  // El mismo par de filtros va a las dos mitades de la página. getResumenOrdenes
  // filtra por la parcela de cada línea, así que producción y costo de insumos
  // terminan hablando siempre del mismo conjunto de parcelas.
  const filtros = { campania, variedad };

  const [data, resumen, variedades, campanias] = await Promise.all([
    getIndicadores(filtros),
    getResumenOrdenes(filtros),
    getVariedadesIndicadores(),
    getCampanias(),
  ]);

  const { porParcela, porVariedad, totales } = data;

  const queryExport = new URLSearchParams();
  if (campania) queryExport.set("campania", campania);
  if (variedad) queryExport.set("variedad", variedad);

  const stats: Stat[] = [
    {
      label: "Superficie",
      value: formatHa(totales.superficieHa),
      unit: "ha",
      hint: `${totales.parcelas} parcelas`,
    },
    { label: "Producción", value: formatNumero(totales.produccionKg), unit: "kg" },
    {
      label: "Rendimiento general",
      value: formatNumero(totales.rendimientoKgHa),
      unit: "kg/ha",
    },
    {
      label: "Exportación",
      value: formatPct(totales.pctExportacion),
      hint: `${formatNumero(totales.kgExportacion)} kg`,
    },
    {
      label: "Costo de insumos",
      value: formatUsd(resumen.costoTotal),
      unit: "U$S",
      hint: `${resumen.parcelasConOrden} parcelas con órdenes`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Indicadores"
        description="Producción, rendimiento, exportación y costo de insumos por parcela. Todo se deriva de los movimientos y de las órdenes de trabajo: no hay ninguna tabla de métricas que alguien tenga que mantener al día."
        stats={stats}
        actions={
          <ExportLink tipo="indicadores" query={queryExport.toString()} />
        }
      />

      <IndicadoresFiltros
        campanias={campanias}
        variedades={variedades}
        campania={campania}
        variedad={variedad}
      />

      <Section
        id="por-variedad"
        title="Por variedad"
        description="El rendimiento de una variedad no es el promedio de sus parcelas: es la suma de kilos sobre la suma de hectáreas."
      >
        {porVariedad.length === 0 ? (
          <EmptyState title="No hay variedades para este filtro" />
        ) : (
          <TableCard>
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Variedad
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Parcelas
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Superficie
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Producción
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Rendimiento
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Exportación
                  </th>
                </tr>
              </thead>
              <tbody>
                {porVariedad.map((v) => (
                  <tr
                    key={v.variedad}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2.5 font-medium capitalize text-ink">
                      {v.variedad}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-ink">
                      {v.parcelas}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-ink">
                      {formatHa(v.superficieHa)} ha
                    </td>
                    <td className="num px-3 py-2.5 text-right text-ink">
                      {formatNumero(v.produccionKg)} kg
                    </td>
                    <td className="num px-3 py-2.5 text-right text-ink">
                      {v.produccionKg > 0
                        ? `${formatNumero(v.rendimientoKgHa)} kg/ha`
                        : "-"}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-ink">
                      {v.produccionKg > 0 ? formatPct(v.pctExportacion) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </Section>

      <Section
        id="por-parcela"
        title="Producción y exportación por parcela"
        description="El % de exportación no está guardado en ningún lado: se reconstruye siguiendo el lote que produjo cada parcela hasta los remitos de salida."
      >
        {porParcela.length === 0 ? (
          <EmptyState title="No hay parcelas para este filtro" />
        ) : (
          <IndicadoresTable filas={porParcela} totales={totales} />
        )}
      </Section>

      <Section
        id="costo-por-parcela"
        title="Costo de insumos por parcela"
        description="Lo que costó el plan sanitario de una parcela, al lado de lo que esa misma parcela produjo. U$S/tn es la división de las dos: cuánto insumo hubo que poner por tonelada cosechada."
      >
        {porParcela.length === 0 ? (
          <EmptyState title="No hay parcelas para este filtro" />
        ) : (
          <CostoPorParcelaTable produccion={porParcela} costos={resumen.porParcela} />
        )}
      </Section>

      <Section
        id="costo-por-insumo"
        title="Costo por tipo de insumo"
        description="Dónde se concentra el gasto del plan sanitario."
      >
        {resumen.porCategoria.length === 0 ? (
          <EmptyState
            title="No hay órdenes de trabajo para este filtro"
            description="Las parcelas del filtro no tienen ninguna aplicación cargada, así que no hay costo que repartir por categoría."
          />
        ) : (
          <CostoPorCategoriaTable filas={resumen.porCategoria} />
        )}
      </Section>
    </>
  );
}
