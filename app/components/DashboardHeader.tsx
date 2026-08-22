import { Plant } from "@phosphor-icons/react/ssr";
import { formatEntero, formatKg } from "./format";

type Props = {
  totalKg: number;
  movimientosCount: number;
};

export function DashboardHeader({ totalKg, movimientosCount }: Props) {
  return (
    <header className="sticky top-0 z-sticky -mx-4 border-b border-border bg-bg px-4 py-4 md:-mx-6 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <Plant
            size={26}
            weight="fill"
            className="shrink-0 text-accent"
            aria-hidden
          />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
              Stock y trazabilidad
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Una sola verdad para las 4 ubicaciones propias
            </p>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="text-sm text-muted">Total en propias</dt>
            <dd className="num mt-0.5 text-2xl font-medium tracking-tight text-ink">
              {formatKg(totalKg)}{" "}
              <span className="text-base font-normal text-muted">kg</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Movimientos</dt>
            <dd className="num mt-0.5 text-2xl font-medium tracking-tight text-ink">
              {formatEntero(movimientosCount)}
            </dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
