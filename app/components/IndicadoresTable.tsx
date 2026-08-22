import type { Parcela, ProduccionParcela } from "@/lib/mocks/campo";
import {
  costoPorHectarea,
  formatHa,
  formatNumero,
  formatPct,
  formatUsd,
  getProduccion,
  rendimiento,
} from "@/lib/mocks/campo";

type Props = {
  parcelas: Parcela[];
};

export function IndicadoresTable({ parcelas }: Props) {
  const filas = parcelas.map((parcela) => {
    const produccion = getProduccion(parcela.codigo);
    const kg = produccion?.kgCosechados ?? 0;
    const pctExportacion = produccion?.pctExportacion ?? 0;
    const kgHa = produccion ? rendimiento(produccion, parcela) : 0;
    const costoHa = costoPorHectarea(parcela);
    return { parcela, produccion, kg, pctExportacion, kgHa, costoHa };
  });

  const mejorRendimiento = filas.reduce(
    (max, fila) => (fila.kgHa > max ? fila.kgHa : max),
    0,
  );

  const totales = filas.reduce(
    (acc, fila) => ({
      superficieHa: acc.superficieHa + fila.parcela.superficieHa,
      kg: acc.kg + fila.kg,
      costoTotal: acc.costoTotal + fila.costoHa * fila.parcela.superficieHa,
    }),
    { superficieHa: 0, kg: 0, costoTotal: 0 },
  );
  const rendimientoPromedio =
    totales.superficieHa > 0 ? totales.kg / totales.superficieHa : 0;
  const costoHaPromedio =
    totales.superficieHa > 0 ? totales.costoTotal / totales.superficieHa : 0;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[52rem] text-sm">
        <caption className="sr-only">
          Indicadores de producción y costo por parcela
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th scope="col" className="px-3 py-2 font-medium">
              Parcela
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Variedad
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Superficie (ha)
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Producción (kg)
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Rendimiento (kg/ha)
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Exportación
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Costo insumos (U$S/ha)
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => {
            const delay =
              i === 0 ? "reveal" : `reveal reveal-delay-${Math.min(i, 3)}`;
            const esMejor =
              fila.kgHa > 0 && fila.kgHa === mejorRendimiento;
            return (
              <tr
                key={fila.parcela.codigo}
                className={`border-b border-border last:border-0 hover:bg-bg ${delay}`}
              >
                <td className="px-3 py-2.5 font-medium text-ink">
                  {fila.parcela.codigo}
                </td>
                <td className="px-3 py-2.5 capitalize text-ink">
                  {fila.parcela.variedad}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {formatHa(fila.parcela.superficieHa)}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {formatNumero(fila.kg)}
                </td>
                <td className="num px-3 py-2.5 text-right">
                  <span
                    className={
                      esMejor
                        ? "rounded-lg bg-ok-bg px-1.5 py-0.5 font-medium text-ok"
                        : "text-ink"
                    }
                  >
                    {formatNumero(fila.kgHa)}
                  </span>
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {formatPct(fila.pctExportacion)}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {formatUsd(fila.costoHa)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-bg/60 font-medium">
            <td className="px-3 py-2.5 text-ink" colSpan={2}>
              Total / promedio
            </td>
            <td className="num px-3 py-2.5 text-right text-ink">
              {formatHa(totales.superficieHa)}
            </td>
            <td className="num px-3 py-2.5 text-right text-ink">
              {formatNumero(totales.kg)}
            </td>
            <td className="num px-3 py-2.5 text-right text-ink">
              {formatNumero(rendimientoPromedio)}
            </td>
            <td className="px-3 py-2.5" />
            <td className="num px-3 py-2.5 text-right text-ink">
              {formatUsd(costoHaPromedio)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
