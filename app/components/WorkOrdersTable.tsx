import Link from "next/link";
import { CalendarBlank } from "@phosphor-icons/react/ssr";
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

type DiaOrdenes = {
  dia: string;
  etiqueta: string;
  ordenes: OrdenDTO[];
  costo: number;
};

/** Lo usa también la ficha de `/ordenes/[id]`: el badge tiene que ser el mismo. */
export const ESTADO_CLASSES: Record<EstadoOrden, string> = {
  BORRADOR: "border-border bg-bg text-muted",
  EMITIDA: "border-accent/30 bg-accent/10 text-accent-strong",
  EJECUTADA: "border-ok/20 bg-ok-bg text-ok",
};

function claveDia(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mes}-${dia}`;
}

function etiquetaDia(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function hora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

function agruparPorFecha(ordenes: OrdenDTO[]): DiaOrdenes[] {
  const porDia = new Map<string, OrdenDTO[]>();
  for (const orden of ordenes) {
    const dia = claveDia(orden.fechaTarea);
    const lista = porDia.get(dia);
    if (lista) lista.push(orden);
    else porDia.set(dia, [orden]);
  }

  return [...porDia.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dia, lista]) => {
      const ordenados = [...lista].sort((a, b) =>
        b.fechaTarea.localeCompare(a.fechaTarea),
      );
      return {
        dia,
        etiqueta: etiquetaDia(ordenados[0]!.fechaTarea),
        ordenes: ordenados,
        costo: ordenados.reduce((s, o) => s + o.costoTotal, 0),
      };
    });
}

function Encabezado() {
  return (
    <thead>
      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
        <th scope="col" className="px-4 py-2 font-medium">
          N.º
        </th>
        <th scope="col" className="px-4 py-2 font-medium">
          Hora
        </th>
        <th scope="col" className="px-4 py-2 font-medium">
          Aplicador
        </th>
        <th scope="col" className="px-4 py-2 font-medium">
          Parcela
        </th>
        <th scope="col" className="px-4 py-2 font-medium">
          Herramienta
        </th>
        <th scope="col" className="px-4 py-2 text-right font-medium">
          Insumos
        </th>
        <th scope="col" className="px-4 py-2 text-right font-medium">
          Costo (U$S)
        </th>
        <th scope="col" className="px-4 py-2 font-medium">
          Estado
        </th>
      </tr>
    </thead>
  );
}

function Filas({ ordenes }: { ordenes: OrdenDTO[] }) {
  return (
    <tbody>
      {ordenes.map((orden) => (
        <Fragment key={orden.id}>
          <tr className="border-b border-border bg-bg/40">
            <td className="num px-4 py-3 font-medium">
              <Link
                href={`/ordenes/${orden.id}`}
                className="text-accent-strong underline-offset-2 transition-colors hover:underline"
                aria-label={`Ver la orden número ${orden.numero}`}
              >
                {orden.numero}
              </Link>
            </td>
            <td
              className="num whitespace-nowrap px-4 py-3 text-ink"
              title={formatFechaHora(orden.fechaTarea)}
            >
              {hora(orden.fechaTarea)}
            </td>
            <td className="px-4 py-3 text-ink">{orden.aplicador}</td>
            <td className="px-4 py-3 text-ink">
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
            <td className="px-4 py-3 text-ink">
              {HERRAMIENTA_LABEL[orden.herramienta]}
            </td>
            <td className="num px-4 py-3 text-right text-ink">
              {orden.lineas.length}
            </td>
            <td className="num px-4 py-3 text-right font-medium text-ink">
              {formatUsd(orden.costoTotal)}
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${ESTADO_CLASSES[orden.estado]}`}
              >
                {ESTADO_LABEL[orden.estado]}
              </span>
            </td>
          </tr>
          {orden.lineas.map((linea) => (
            <tr key={linea.id} className="border-b border-border text-muted last:border-0">
              <td className="px-4 py-1.5" />
              <td className="px-4 py-1.5" colSpan={3}>
                <span className="text-ink">{linea.marca}</span>
                <span className="text-muted"> · {linea.principioActivo}</span>
              </td>
              <td className="num px-4 py-1.5 text-right">
                {formatNumero(linea.dosisHa, 2)} /ha
              </td>
              <td className="num px-4 py-1.5 text-right">
                {formatHa(linea.totalUso)} u.
              </td>
              <td className="num px-4 py-1.5 text-right">
                {formatUsd(linea.costoUsd)}
              </td>
              <td className="px-4 py-1.5" />
            </tr>
          ))}
        </Fragment>
      ))}
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

  const dias = agruparPorFecha(ordenes);

  return (
    <div className="flex flex-col gap-6">
      {dias.map((dia, i) => (
        <section
          key={dia.dia}
          aria-labelledby={`ordenes-${dia.dia}`}
          className={`overflow-hidden rounded-xl border border-border bg-surface shadow-card ${
            i === 0 ? "reveal" : `reveal reveal-delay-${Math.min(i, 3)}`
          }`}
        >
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border bg-bg px-4 py-3">
            <h3
              id={`ordenes-${dia.dia}`}
              className="flex items-center gap-2 text-sm font-semibold text-ink"
            >
              <CalendarBlank size={16} className="text-accent" aria-hidden />
              {dia.etiqueta}
            </h3>
            <p className="text-xs text-muted">
              <span className="num font-medium text-ink">{dia.ordenes.length}</span>{" "}
              {dia.ordenes.length === 1 ? "orden" : "órdenes"} ·{" "}
              <span className="num font-medium text-ink">{formatUsd(dia.costo)} U$S</span>
            </p>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <caption className="sr-only">
                Órdenes de trabajo del {dia.etiqueta}
              </caption>
              <Encabezado />
              <Filas ordenes={dia.ordenes} />
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
