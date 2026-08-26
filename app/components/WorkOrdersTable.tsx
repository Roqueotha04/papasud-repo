import { CaretDown } from "@phosphor-icons/react/ssr";
import { Fragment } from "react";
import {
  ESTADO_LABEL,
  HERRAMIENTA_LABEL,
  formatFechaHora,
  formatHa,
  formatNumero,
  formatUsd,
  type OrdenDTO,
} from "@/lib/ordenes";
import type { EstadoOrden } from "@/app/generated/prisma/enums";

type Props = {
  ordenes: OrdenDTO[];
};

// Cuántas órdenes se muestran antes de plegar el resto. Cada orden ocupa varias
// filas (una por línea de insumo), así que con pocas ya se llena la pantalla.
const VISIBLES = 4;

/** Lo usa también la ficha de `/ordenes/[id]`: el badge tiene que ser el mismo. */
export const ESTADO_CLASSES: Record<EstadoOrden, string> = {
  BORRADOR: "border-border bg-bg text-muted",
  EMITIDA: "border-accent/30 bg-accent/10 text-accent-strong",
  EJECUTADA: "border-ok/20 bg-ok-bg text-ok",
};

function Encabezado() {
  return (
    <thead>
      <tr className="border-b border-border text-left text-muted">
        <th scope="col" className="px-3 py-2 font-medium">
          N.º
        </th>
        <th scope="col" className="px-3 py-2 font-medium">
          Fecha tarea
        </th>
        <th scope="col" className="px-3 py-2 font-medium">
          Aplicador
        </th>
        <th scope="col" className="px-3 py-2 font-medium">
          Parcela
        </th>
        <th scope="col" className="px-3 py-2 font-medium">
          Herramienta
        </th>
        <th scope="col" className="px-3 py-2 text-right font-medium">
          Insumos
        </th>
        <th scope="col" className="px-3 py-2 text-right font-medium">
          Costo (U$S)
        </th>
        <th scope="col" className="px-3 py-2 font-medium">
          Estado
        </th>
      </tr>
    </thead>
  );
}

function Filas({ ordenes }: { ordenes: OrdenDTO[] }) {
  return (
    <tbody>
      {ordenes.map((orden, i) => {
        const delay = i === 0 ? "reveal" : `reveal reveal-delay-${Math.min(i, 3)}`;

        return (
          <Fragment key={orden.id}>
            <tr className={`border-b border-border bg-bg/40 ${delay}`}>
              <td className="num px-3 py-2.5 font-medium">
                <a
                  href={`/ordenes/${orden.id}`}
                  className="text-accent-strong underline-offset-2 transition-colors hover:underline"
                  aria-label={`Ver la orden número ${orden.numero}`}
                >
                  {orden.numero}
                </a>
              </td>
              <td className="num whitespace-nowrap px-3 py-2.5 text-ink">
                {formatFechaHora(orden.fechaTarea)}
              </td>
              <td className="px-3 py-2.5 text-ink">{orden.aplicador}</td>
              <td className="px-3 py-2.5 text-ink">
                {orden.parcela ? (
                  <>
                    {orden.parcela.codigo}
                    <span className="ml-1 capitalize text-muted">
                      ({orden.parcela.variedad})
                    </span>
                  </>
                ) : (
                  <span className="text-muted">Sin parcela</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-ink">
                {HERRAMIENTA_LABEL[orden.herramienta]}
              </td>
              <td className="num px-3 py-2.5 text-right text-ink">
                {orden.lineas.length}
              </td>
              <td className="num px-3 py-2.5 text-right font-medium text-ink">
                {formatUsd(orden.costoTotal)}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${ESTADO_CLASSES[orden.estado]}`}
                >
                  {ESTADO_LABEL[orden.estado]}
                </span>
              </td>
            </tr>
            {orden.lineas.map((linea) => (
              <tr
                key={linea.id}
                className="border-b border-border text-muted last:border-0"
              >
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" colSpan={3}>
                  <span className="text-ink">{linea.marca}</span>
                  <span className="text-muted"> · {linea.principioActivo}</span>
                </td>
                <td className="num px-3 py-1.5 text-right">
                  {formatNumero(linea.dosisHa, 2)} /ha
                </td>
                <td className="num px-3 py-1.5 text-right">
                  {formatHa(linea.totalUso)} u.
                </td>
                <td className="num px-3 py-1.5 text-right">
                  {formatUsd(linea.costoUsd)}
                </td>
                <td className="px-3 py-1.5" />
              </tr>
            ))}
          </Fragment>
        );
      })}
    </tbody>
  );
}

export function WorkOrdersTable({ ordenes }: Props) {
  if (ordenes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-5 text-sm text-muted">
        No hay órdenes de trabajo cargadas.
      </div>
    );
  }

  const visibles = ordenes.slice(0, VISIBLES);
  const ocultas = ordenes.slice(VISIBLES);
  const costoOculto = ocultas.reduce((s, o) => s + o.costoTotal, 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[56rem] text-sm">
        <caption className="sr-only">
          Órdenes de trabajo con sus líneas de insumo
        </caption>
        <Encabezado />
        <Filas ordenes={visibles} />
      </table>

      {ocultas.length > 0 ? (
        <details className="group border-t border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm text-muted transition-colors hover:bg-bg hover:text-ink">
            <span className="flex items-center gap-1.5">
              <CaretDown
                size={14}
                className="transition-transform group-open:rotate-180"
                aria-hidden
              />
              <span className="group-open:hidden">
                Ver {ocultas.length}{" "}
                {ocultas.length === 1 ? "orden más" : "órdenes más"}
              </span>
              <span className="hidden group-open:inline">Ver menos</span>
            </span>
            <span className="num shrink-0 group-open:hidden">
              {formatUsd(costoOculto)} U$S
            </span>
          </summary>
          <table className="w-full min-w-[56rem] text-sm">
            <caption className="sr-only">Resto de las órdenes de trabajo</caption>
            <Encabezado />
            <Filas ordenes={ocultas} />
          </table>
        </details>
      ) : null}
    </div>
  );
}
