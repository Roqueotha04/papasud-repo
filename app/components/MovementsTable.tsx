import { Package } from "@phosphor-icons/react/ssr";
import type { MovimientoDTO } from "@/lib/types";
import { formatFecha, formatKg, movementTypeLabel } from "./format";

// Tabla compacta de movimientos, una fila por remito. Es la vista de vistazo
// que usa el resumen; la lista operativa separada por jornada es
// MovementsByDate, en /movimientos.

type Props = {
  movimientos: MovimientoDTO[];
};

export function MovementsTable({ movimientos }: Props) {
  const empty = movimientos.length === 0;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="sr-only">
        Últimos movimientos
      </h2>

      {empty ? (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-surface px-4 py-5">
          <Package size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <div>
            <p className="font-medium text-ink">Todavía no hay movimientos</p>
            <p className="mt-0.5 text-sm text-muted">
              El stock se deriva de lo que registres.{" "}
              <a
                href="/movimientos#registrar"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Cargá el primero
              </a>{" "}
              para empezar la trazabilidad.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">Historial reciente de movimientos</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th scope="col" className="px-3 py-2 font-medium">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Tipo
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Origen → destino
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Variedad / lote
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  kg
                </th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((mov, i) => {
                const kg = mov.items.reduce((sum, item) => sum + item.kg, 0);
                const lotes =
                  mov.items.length === 0
                    ? "Sin ítems"
                    : mov.items
                        .map((item) => `${item.variedad} · ${item.lote}`)
                        .join(", ");
                const delay =
                  i === 0
                    ? "reveal"
                    : `reveal reveal-delay-${Math.min(i, 3)}`;

                return (
                  <tr
                    key={mov.id}
                    className={`border-b border-border last:border-0 hover:bg-bg ${delay}`}
                  >
                    <td className="num whitespace-nowrap px-3 py-2.5 text-ink">
                      {formatFecha(mov.fecha)}
                    </td>
                    <td className="px-3 py-2.5 text-ink">
                      {movementTypeLabel(mov.tipo)}
                    </td>
                    <td className="px-3 py-2.5 text-ink">
                      {mov.origen} → {mov.destino}
                    </td>
                    <td
                      className="max-w-[16rem] truncate px-3 py-2.5 capitalize text-ink"
                      title={lotes}
                    >
                      {lotes}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-ink">
                      {formatKg(kg)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
