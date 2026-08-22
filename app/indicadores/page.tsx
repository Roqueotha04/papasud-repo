import { IndicadoresTable } from "@/app/components/IndicadoresTable";
import {
  EmptyState,
  PageHeader,
  Section,
  TableCard,
  type Stat,
} from "@/app/components/Page";
import {
  getIndicadores,
  getVariedadesIndicadores,
} from "@/lib/actions/indicadores";
import { formatHa, formatNumero, formatPct } from "@/lib/indicadores";

type SearchParams = Promise<{ variedad?: string | string[] }>;

function FiltroVariedades({
  variedades,
  activa,
}: {
  variedades: string[];
  activa?: string;
}) {
  const clase = (active: boolean) =>
    active
      ? "rounded-lg bg-accent-strong px-3 py-1.5 text-sm font-medium capitalize text-white"
      : "rounded-lg px-3 py-1.5 text-sm font-medium capitalize text-muted transition-colors hover:bg-surface hover:text-ink";

  return (
    <nav aria-label="Filtrar por variedad" className="flex flex-wrap gap-1.5">
      <a
        href="/indicadores"
        aria-current={!activa ? "page" : undefined}
        className={clase(!activa)}
      >
        Todas
      </a>
      {variedades.map((v) => (
        <a
          key={v}
          href={`/indicadores?variedad=${encodeURIComponent(v)}`}
          aria-current={v === activa ? "page" : undefined}
          className={clase(v === activa)}
        >
          {v}
        </a>
      ))}
    </nav>
  );
}

export default async function IndicadoresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const variedadParam = Array.isArray(params.variedad)
    ? params.variedad[0]
    : params.variedad;
  const variedadFiltro = variedadParam?.trim() || undefined;

  const [data, variedades] = await Promise.all([
    getIndicadores(variedadFiltro ? { variedad: variedadFiltro } : undefined),
    getVariedadesIndicadores(),
  ]);

  const { porParcela, porVariedad, totales } = data;

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
  ];

  return (
    <>
      <PageHeader
        title="Indicadores"
        description="Producción, rendimiento y exportación por parcela. Todo se deriva de los movimientos: no hay ninguna tabla de métricas que alguien tenga que mantener al día."
        stats={stats}
        actions={
          <FiltroVariedades variedades={variedades} activa={variedadFiltro} />
        }
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
        title="Por parcela"
        description="El % de exportación no está guardado en ningún lado: se reconstruye siguiendo el lote que produjo cada parcela hasta los remitos de salida."
      >
        {porParcela.length === 0 ? (
          <EmptyState title="No hay parcelas para este filtro" />
        ) : (
          <IndicadoresTable filas={porParcela} totales={totales} />
        )}
      </Section>
    </>
  );
}
