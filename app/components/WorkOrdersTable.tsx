import { Fragment } from "react";
import type { OrdenTrabajo } from "@/lib/mocks/campo";
import {
  costoLinea,
  costoOrden,
  formatFechaHora,
  formatHa,
  formatNumero,
  formatUsd,
  getInsumo,
  getParcela,
  totalUso,
} from "@/lib/mocks/campo";

type Props = {
  ordenes: OrdenTrabajo[];
};

const ESTADO_CLASSES: Record<OrdenTrabajo["estado"], string> = {
  Borrador: "border-border bg-bg text-muted",
  Emitida: "border-accent/30 bg-accent/10 text-accent-strong",
  Ejecutada: "border-ok/20 bg-ok-bg text-ok",
};

export function WorkOrdersTable({ ordenes }: Props) {
  const empty = ordenes.length === 0;

  if (empty) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-5 text-sm text-muted">
        No hay órdenes de trabajo cargadas.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[56rem] text-sm">
        <caption className="sr-only">
          Órdenes de trabajo con sus líneas de insumo
        </caption>
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
        <tbody>
          {ordenes.map((orden, i) => {
            const parcela = getParcela(orden.parcelaCodigo);
            const delay =
              i === 0 ? "reveal" : `reveal reveal-delay-${Math.min(i, 3)}`;

            return (
              <Fragment key={`orden-${orden.numero}`}>
                <tr
                  className={`border-b border-border bg-bg/40 ${delay}`}
                >
                  <td className="num px-3 py-2.5 font-medium text-ink">
                    {orden.numero}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-ink">
                    {formatFechaHora(orden.fechaTarea)}
                  </td>
                  <td className="px-3 py-2.5 text-ink">{orden.aplicador}</td>
                  <td className="px-3 py-2.5 text-ink">
                    {orden.parcelaCodigo}
                    {parcela ? (
                      <span className="ml-1 text-muted capitalize">
                        ({parcela.variedad})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-ink">{orden.herramienta}</td>
                  <td className="num px-3 py-2.5 text-right text-ink">
                    {orden.lineas.length}
                  </td>
                  <td className="num px-3 py-2.5 text-right font-medium text-ink">
                    {formatUsd(costoOrden(orden))}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${ESTADO_CLASSES[orden.estado]}`}
                    >
                      {orden.estado}
                    </span>
                  </td>
                </tr>
                {orden.lineas.map((linea, li) => {
                  const insumo = getInsumo(linea.insumoId);
                  const uso = parcela ? totalUso(linea, parcela) : 0;
                  const costo =
                    insumo && parcela ? costoLinea(linea, insumo, parcela) : 0;
                  return (
                    <tr
                      key={`orden-${orden.numero}-linea-${li}`}
                      className="border-b border-border text-muted last:border-0"
                    >
                      <td className="px-3 py-1.5" />
                      <td className="px-3 py-1.5" colSpan={3}>
                        <span className="text-ink">
                          {insumo?.marca ?? linea.insumoId}
                        </span>
                        {insumo ? (
                          <span className="text-muted"> · {insumo.principioActivo}</span>
                        ) : null}
                      </td>
                      <td className="num px-3 py-1.5 text-right">
                        {formatNumero(linea.dosisHa, 2)} /ha
                      </td>
                      <td className="num px-3 py-1.5 text-right">
                        {formatHa(uso)} u.
                      </td>
                      <td className="num px-3 py-1.5 text-right">
                        {formatUsd(costo)}
                      </td>
                      <td className="px-3 py-1.5" />
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
