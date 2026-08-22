import type { ParcelaIndicador, TotalesIndicador } from "@/lib/indicadores";
import { formatHa, formatNumero, formatPct } from "@/lib/indicadores";

type Props = {
  filas: ParcelaIndicador[];
  totales: TotalesIndicador;
};

export function IndicadoresTable({ filas, totales }: Props) {
  const mejorRendimiento = filas.reduce(
    (max, fila) => (fila.rendimientoKgHa > max ? fila.rendimientoKgHa : max),
    0,
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[52rem] text-sm">
        <caption className="sr-only">
          Indicadores de producción, rendimiento y exportación por parcela
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
              Exportación (kg)
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              % Exportación
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Bolsas
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => {
            const delay =
              i === 0 ? "reveal" : `reveal reveal-delay-${Math.min(i, 3)}`;
            const sinActividad = fila.produccionKg === 0;
            const esMejor =
              !sinActividad && fila.rendimientoKgHa === mejorRendimiento;
            return (
              <tr
                key={fila.parcelaId}
                className={`border-b border-border last:border-0 hover:bg-bg ${delay}`}
              >
                <td className="px-3 py-2.5 font-medium text-ink">
                  {fila.codigo}
                </td>
                <td className="px-3 py-2.5 capitalize text-ink">
                  {fila.variedad}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {formatHa(fila.superficieHa)}
                </td>
                {sinActividad ? (
                  <td
                    className="num px-3 py-2.5 text-right text-muted"
                    title="Sin ingresos registrados en la campaña"
                  >
                    -
                  </td>
                ) : (
                  <td className="num px-3 py-2.5 text-right text-ink">
                    {formatNumero(fila.produccionKg)}
                  </td>
                )}
                <td className="num px-3 py-2.5 text-right">
                  {sinActividad ? (
                    <span
                      className="text-muted"
                      title="Sin ingresos registrados en la campaña"
                    >
                      -
                    </span>
                  ) : (
                    <span
                      className={
                        esMejor
                          ? "rounded-lg bg-ok-bg px-1.5 py-0.5 font-medium text-ok"
                          : "text-ink"
                      }
                    >
                      {formatNumero(fila.rendimientoKgHa)}
                    </span>
                  )}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {sinActividad ? (
                    <span className="text-muted">-</span>
                  ) : (
                    formatNumero(fila.kgExportacion)
                  )}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {sinActividad ? (
                    <span className="text-muted">-</span>
                  ) : (
                    formatPct(fila.pctExportacion)
                  )}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {sinActividad ? (
                    <span className="text-muted">-</span>
                  ) : (
                    formatNumero(fila.bolsas)
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-bg/60 font-medium">
            <td className="px-3 py-2.5 text-ink" colSpan={2}>
              Total
            </td>
            <td className="num px-3 py-2.5 text-right text-ink">
              {formatHa(totales.superficieHa)}
            </td>
            <td className="num px-3 py-2.5 text-right text-ink">
              {formatNumero(totales.produccionKg)}
            </td>
            <td className="num px-3 py-2.5 text-right text-ink">
              {formatNumero(totales.rendimientoKgHa)}
            </td>
            <td className="num px-3 py-2.5 text-right text-ink">
              {formatNumero(totales.kgExportacion)}
            </td>
            <td className="num px-3 py-2.5 text-right text-ink">
              {formatPct(totales.pctExportacion)}
            </td>
            <td className="num px-3 py-2.5 text-right text-ink">
              {formatNumero(totales.bolsas)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
