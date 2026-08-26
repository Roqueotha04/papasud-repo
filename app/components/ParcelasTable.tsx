import Link from "next/link";
import { Flask } from "@phosphor-icons/react/ssr";
import { ExpandRest } from "@/app/components/ExpandRest";
import { TableCard } from "@/app/components/Page";
import type { getParcelas } from "@/lib/actions/parcelas";

export type FilaParcela = Awaited<ReturnType<typeof getParcelas>>[number];

// Cuántas parcelas se muestran antes de plegar el resto detrás de "Ver todas".
const VISIBLES = 8;

function formatKg(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function formatHa(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
}

function Encabezado() {
  return (
    <thead>
      <tr className="border-b border-border text-left text-muted">
        <th scope="col" className="px-3 py-2 font-medium">
          Código
        </th>
        <th scope="col" className="px-3 py-2 font-medium">
          Variedad
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
        <th scope="col" className="px-3 py-2 font-medium">
          Muestreo
        </th>
      </tr>
    </thead>
  );
}

function Filas({ filas }: { filas: FilaParcela[] }) {
  return (
    <tbody>
      {filas.map((p) => (
        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg">
          <td className="px-3 py-2.5">
            <Link
              href={`/parcelas/${p.id}`}
              className="num font-medium text-accent-strong underline-offset-2 hover:underline"
            >
              {p.codigo}
            </Link>
          </td>
          <td className="px-3 py-2.5 capitalize text-ink">{p.variedad}</td>
          <td className="num px-3 py-2.5 text-right text-ink">
            {formatHa(p.superficieHa)} ha
          </td>
          <td className="num px-3 py-2.5 text-right text-ink">
            {p.kgTotal > 0 ? `${formatKg(p.kgTotal)} kg` : "-"}
          </td>
          <td className="num px-3 py-2.5 text-right text-ink">
            {p.kgTotal > 0 ? `${formatKg(p.rendimientoKgHa)} kg/ha` : "-"}
          </td>
          <td className="px-3 py-2.5">
            {p.tieneMuestreos ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2 py-0.5 text-xs font-medium text-ok">
                <Flask size={12} aria-hidden />
                Con muestreo
              </span>
            ) : (
              <span className="text-xs text-muted">Sin muestreo</span>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export function ParcelasTable({ filas }: { filas: FilaParcela[] }) {
  const visibles = filas.slice(0, VISIBLES);
  const ocultas = filas.slice(VISIBLES);

  return (
    <TableCard>
      <table className="w-full min-w-[42rem] text-sm">
        <Encabezado />
        <Filas filas={visibles} />
      </table>

      {ocultas.length > 0 ? (
        <ExpandRest
          label={`Ver todas (${filas.length}), ${ocultas.length} más`}
        >
          <table className="w-full min-w-[42rem] text-sm">
            <caption className="sr-only">Resto de las parcelas</caption>
            <Filas filas={ocultas} />
          </table>
        </ExpandRest>
      ) : null}
    </TableCard>
  );
}
