import { CheckCircle, Warning } from "@phosphor-icons/react/ssr";
import type { Discrepancia } from "@/lib/types";
import { formatKg } from "./format";

type Props = {
  items: Discrepancia[];
};

export function DiscrepanciesPanel({ items }: Props) {
  const empty = items.length === 0;

  return (
    <>
      {empty ? (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-ok-bg px-4 py-4">
          <CheckCircle
            size={22}
            weight="fill"
            className="mt-0.5 shrink-0 text-ok"
            aria-hidden
          />
          <div>
            <p className="font-medium text-ink">Sin discrepancias</p>
            <p className="mt-0.5 text-sm text-muted">
              El stock derivado de movimientos coincide con el último conteo.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-danger/25 bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">
              Diferencias entre stock esperado y contado
            </caption>
            <thead>
              <tr className="border-b border-border bg-danger-bg text-left">
                <th scope="col" className="px-3 py-2 font-medium text-ink">
                  Ubicación
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-ink">
                  Variedad / lote
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-medium text-ink"
                >
                  Esperado
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-medium text-ink"
                >
                  Contado
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-medium text-ink"
                >
                  Diferencia
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={`${item.locationId}-${item.lote}-${item.variedad}`}
                  className={`border-b border-border last:border-0 ${i === 0 ? "reveal" : `reveal reveal-delay-${Math.min(i, 3)}`}`}
                >
                  <td className="px-3 py-2.5 text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      <Warning
                        size={16}
                        weight="fill"
                        className="shrink-0 text-danger"
                        aria-hidden
                      />
                      {item.locationNombre}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-ink">
                    <span className="capitalize">{item.variedad}</span>
                    {" · "}
                    {item.lote}
                    {item.hipotesis ? (
                      <span className="mt-0.5 block text-muted">
                        {item.hipotesis}
                      </span>
                    ) : null}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink">
                    {formatKg(item.esperadoKg)} kg
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink">
                    {formatKg(item.contadoKg)} kg
                  </td>
                  <td className="num px-3 py-2.5 text-right font-medium text-danger">
                    {formatSignedKg(item.diffKg)} kg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function formatSignedKg(n: number): string {
  const formatted = formatKg(Math.abs(n));
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted}`;
  return formatted;
}
