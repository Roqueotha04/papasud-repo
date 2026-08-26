import type { ParcelaIndicador } from "@/lib/indicadores";
import { formatHa, formatNumero, formatPct } from "@/lib/indicadores";
import { formatUsd, type CostoPorParcela } from "@/lib/ordenes";

type Props = {
  produccion: ParcelaIndicador;
  costo?: CostoPorParcela;
};

const SIN_DATO = <span className="text-muted">-</span>;

/** Producción y costo de una parcela, leídos juntos. */
export function IndicadoresParcelaDetalle({ produccion, costo }: Props) {
  const costoUsd = costo?.costo ?? 0;
  const costoTn =
    costoUsd > 0 && produccion.produccionKg > 0
      ? costoUsd / (produccion.produccionKg / 1000)
      : null;
  const sinActividad = produccion.produccionKg === 0;

  return (
    <article
      aria-labelledby="parcela-detalle-heading"
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border pb-3">
        <div className="flex items-baseline gap-2">
          <h3 id="parcela-detalle-heading" className="text-base font-semibold text-ink">
            Parcela {produccion.codigo}
          </h3>
          <span className="text-sm capitalize text-muted">{produccion.variedad}</span>
          <span className="num text-sm text-muted">{formatHa(produccion.superficieHa)} ha</span>
        </div>
        <span className="text-xs text-muted">{produccion.campania}</span>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        <Dato
          label="Producción"
          value={sinActividad ? null : `${formatNumero(produccion.produccionKg)} kg`}
        />
        <Dato
          label="Rendimiento"
          value={sinActividad ? null : `${formatNumero(produccion.rendimientoKgHa)} kg/ha`}
        />
        <Dato
          label="Exportación"
          value={sinActividad ? null : formatPct(produccion.pctExportacion)}
          hint={sinActividad ? undefined : `${formatNumero(produccion.kgExportacion)} kg`}
        />
        <Dato
          label="Bolsas"
          value={sinActividad ? null : formatNumero(produccion.bolsas)}
        />
        <Dato
          label="Costo insumos"
          value={costoUsd > 0 ? `${formatUsd(costoUsd)} U$S` : null}
          hint={
            costo && costo.ordenes > 0
              ? `${costo.ordenes} ${costo.ordenes === 1 ? "orden" : "órdenes"}`
              : undefined
          }
        />
        <Dato
          label="U$S / tn"
          value={costoTn == null ? null : formatNumero(costoTn, 1)}
          hint={costo && costo.costoHa > 0 ? `${formatUsd(costo.costoHa)} U$S/ha` : undefined}
        />
      </dl>
    </article>
  );
}

function Dato({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="num mt-0.5 text-lg font-medium tracking-tight text-ink">
        {value ?? SIN_DATO}
      </dd>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
