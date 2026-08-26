import Link from "next/link";
import { Package } from "@phosphor-icons/react/ssr";
import type { StockPorUbicacion, StockRow } from "@/lib/types";
import { ExpandRest } from "./ExpandRest";
import { formatEntero, formatKg } from "./format";

type Props = {
  name: string;
  data?: StockPorUbicacion;
  delayClass?: string;
};

// Cuántas partidas se muestran antes de plegar el resto. Un depósito puede tener
// 25 lotes y la tarjeta se vuelve ilegible; las primeras alcanzan para el pantallazo.
const VISIBLES = 5;

function Filas({ rows }: { rows: StockRow[] }) {
  return (
    <tbody>
      {rows.map((row) => (
        <tr
          key={`${row.lote}-${row.variedad}`}
          className="border-b border-border last:border-0"
        >
          <td className="num py-1.5 pr-3 font-medium text-ink">{row.lote}</td>
          <td className="py-1.5 pr-3 capitalize text-ink">{row.variedad}</td>
          <td className="num py-1.5 pr-3 text-right text-ink">
            {formatKg(row.kg)}
          </td>
          <td className="num py-1.5 text-right text-ink">
            {formatEntero(row.bolsas)}
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function Encabezado() {
  return (
    <thead>
      <tr className="border-b border-border text-left text-muted">
        <th scope="col" className="w-24 py-1.5 pr-3 font-medium">
          Lote
        </th>
        <th scope="col" className="py-1.5 pr-3 font-medium">
          Variedad
        </th>
        <th scope="col" className="w-28 py-1.5 pr-3 text-right font-medium">
          kg
        </th>
        <th scope="col" className="w-24 py-1.5 text-right font-medium">
          Bolsas
        </th>
      </tr>
    </thead>
  );
}

export function LocationCard({ name, data, delayClass }: Props) {
  const rows = data?.rows ?? [];
  const totalKg = data?.totalKg ?? 0;
  const totalBolsas = data?.totalBolsas ?? 0;
  const empty = rows.length === 0;

  const visibles = rows.slice(0, VISIBLES);
  const ocultas = rows.slice(VISIBLES);
  const kgOcultos = ocultas.reduce((s, r) => s + r.kg, 0);
  const bolsasOcultas = ocultas.reduce((s, r) => s + r.bolsas, 0);

  return (
    <article
      className={`flex min-w-0 flex-col rounded-lg border border-border bg-surface p-4 shadow-card ${delayClass ?? ""}`}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="min-w-0 truncate text-base font-semibold text-ink">
          {name}
        </h3>
        <div className="flex items-baseline gap-4">
          <p className="text-sm text-muted">
            <span className="num text-ink">{formatEntero(rows.length)}</span>{" "}
            {rows.length === 1 ? "partida" : "partidas"}
          </p>
          <p className="text-sm text-muted">
            <span className="num text-ink">{formatEntero(totalBolsas)}</span>{" "}
            bolsas
          </p>
          <p className="num text-xl font-medium tracking-tight text-ink">
            {formatKg(totalKg)}{" "}
            <span className="text-sm font-normal text-muted">kg</span>
          </p>
        </div>
      </header>

      {empty ? (
        <div className="flex flex-1 flex-col items-start gap-2 py-3 text-sm text-muted">
          <Package size={22} className="text-accent" aria-hidden />
          <p>
            Sin stock registrado.{" "}
            <Link
              href="/movimientos#registrar"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Cargá un movimiento
            </Link>{" "}
            para que aparezca acá.
          </p>
        </div>
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Stock de {name} por lote</caption>
            <Encabezado />
            <Filas rows={visibles} />
          </table>

          {ocultas.length > 0 ? (
            <ExpandRest
              className="mt-1 rounded-lg border-t border-border px-1 py-2"
              label={`Ver ${formatEntero(ocultas.length)} ${
                ocultas.length === 1 ? "partida más" : "partidas más"
              }`}
              extra={`${formatKg(kgOcultos)} kg · ${formatEntero(bolsasOcultas)} bolsas`}
            >
              <table className="w-full text-sm">
                <caption className="sr-only">Resto del stock de {name}</caption>
                <Encabezado />
                <Filas rows={ocultas} />
              </table>
            </ExpandRest>
          ) : null}
        </div>
      )}
    </article>
  );
}
