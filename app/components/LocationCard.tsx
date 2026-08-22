import { Package } from "@phosphor-icons/react/ssr";
import type { StockPorUbicacion } from "@/lib/types";
import { formatEntero, formatKg } from "./format";

type Props = {
  name: string;
  data?: StockPorUbicacion;
  delayClass?: string;
};

export function LocationCard({ name, data, delayClass }: Props) {
  const rows = data?.rows ?? [];
  const totalKg = data?.totalKg ?? 0;
  const totalBolsas = data?.totalBolsas ?? 0;
  const empty = rows.length === 0;

  return (
    <article
      className={`flex min-w-0 flex-col rounded-lg border border-border bg-surface p-4 shadow-card ${delayClass ?? ""}`}
    >
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-base font-semibold text-ink">
          {name}
        </h3>
        <p className="num shrink-0 text-xl font-medium tracking-tight text-ink">
          {formatKg(totalKg)}{" "}
          <span className="text-sm font-normal text-muted">kg</span>
        </p>
      </header>

      {empty ? (
        <div className="flex flex-1 flex-col items-start gap-2 py-3 text-sm text-muted">
          <Package size={22} className="text-accent" aria-hidden />
          <p>
            Sin stock registrado.{" "}
            <a href="#registrar" className="font-medium text-accent underline-offset-2 hover:underline">
              Cargá un movimiento
            </a>{" "}
            para que aparezca acá.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted">
            {formatEntero(totalBolsas)} bolsas
          </p>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Stock de {name} por lote</caption>
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    Lote
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    Variedad
                  </th>
                  <th
                    scope="col"
                    className="py-1.5 pr-3 text-right font-medium"
                  >
                    kg
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    Bolsas
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.lote}-${row.variedad}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="max-w-[8rem] truncate py-1.5 pr-3 font-medium text-ink">
                      {row.lote}
                    </td>
                    <td className="max-w-[9rem] truncate py-1.5 pr-3 capitalize text-ink">
                      {row.variedad}
                    </td>
                    <td className="num py-1.5 pr-3 text-right text-ink">
                      {formatKg(row.kg)}
                    </td>
                    <td className="num py-1.5 text-right text-ink">
                      {formatEntero(row.bolsas)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </article>
  );
}
