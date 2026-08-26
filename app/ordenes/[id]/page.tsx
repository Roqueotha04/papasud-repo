import {
  ArrowLeft,
  ClipboardText,
  MapPin,
  Note,
  Wind,
} from "@phosphor-icons/react/ssr";
import { notFound } from "next/navigation";
import { ESTADO_CLASSES } from "@/app/components/WorkOrdersTable";
import {
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  HERRAMIENTA_LABEL,
  formatFechaHora,
  formatHa,
  formatNumero,
  formatUsd,
  getOrdenDetalle,
} from "@/lib/ordenes";

type Props = {
  params: Promise<{ id: string }>;
};

/** Hora de la tarea, sola. Es el dato que explica por qué las dos fechas difieren. */
function formatHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

/** Distancia entre emisión y tarea, en la unidad que se lee mejor. */
function formatEspera(desdeISO: string, hastaISO: string): string | null {
  const ms = new Date(hastaISO).getTime() - new Date(desdeISO).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const horas = ms / 3_600_000;
  if (horas < 48) return `${formatNumero(horas, horas < 10 ? 1 : 0)} h`;
  return `${formatNumero(horas / 24, 0)} días`;
}

/** La unidad del insumo es "l/ha": el total usado se mide en "l", sin el /ha. */
function unidadTotal(unidad: string): string {
  return unidad.replace(/\s*\/\s*ha$/i, "");
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}

function StatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="num mt-0.5 text-2xl font-medium tracking-tight text-ink">
        {value}
        {unit ? (
          <span className="ml-1 text-base font-normal text-muted">{unit}</span>
        ) : null}
      </dd>
    </div>
  );
}

export default async function OrdenPage({ params }: Props) {
  const { id } = await params;
  const orden = await getOrdenDetalle(id);

  if (!orden) {
    notFound();
  }

  const espera = formatEspera(orden.fechaEmision, orden.fechaTarea);
  const superficieHa = orden.parcela?.superficieHa ?? 0;
  const costoHa = superficieHa > 0 ? orden.costoTotal / superficieHa : 0;

  return (
    <div className="flex flex-col gap-8">
      <a
        href="/ordenes"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden />
        Volver a órdenes de trabajo
      </a>

      <header className="flex flex-col gap-5 border-b border-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ClipboardText
              size={26}
              weight="fill"
              className="shrink-0 text-accent"
              aria-hidden
            />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
                Orden de trabajo N.º {orden.numero}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                {orden.parcela ? (
                  <>
                    <MapPin size={14} aria-hidden />
                    Parcela {orden.parcela.codigo}
                    <span className="capitalize">
                      · {orden.parcela.variedad}
                    </span>
                    <span className="num">
                      · {formatHa(orden.parcela.superficieHa)} ha
                    </span>
                  </>
                ) : (
                  "Sin parcela asociada"
                )}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${ESTADO_CLASSES[orden.estado]}`}
          >
            {ESTADO_LABEL[orden.estado]}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10">
          <StatTile
            label="Costo de la orden"
            value={formatUsd(orden.costoTotal)}
            unit="U$S"
          />
          {superficieHa > 0 ? (
            <StatTile label="Costo por hectárea" value={formatUsd(costoHa)} unit="U$S/ha" />
          ) : null}
          <StatTile label="Insumos" value={String(orden.lineas.length)} />
          <StatTile label="Aplicador" value={orden.aplicador} />
        </dl>
      </header>

      {/* El gap emisión-tarea es el problema de negocio, no un detalle de
          formulario: se emite en el escritorio y se ejecuta horas después, en la
          ventana sin viento. Por eso va destacado y no escondido en una tabla. */}
      <section
        aria-labelledby="ventana-heading"
        className="flex flex-col gap-3 rounded-lg border border-accent-strong bg-surface p-5"
      >
        <h2
          id="ventana-heading"
          className="flex items-center gap-2 font-semibold text-ink"
        >
          <Wind size={20} className="text-accent" aria-hidden />
          Ventana de aplicación
        </h2>

        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <Dato label="Emitida" value={formatFechaHora(orden.fechaEmision)} />
          <Dato label="Tarea" value={formatFechaHora(orden.fechaTarea)} />
          {espera ? <Dato label="Espera" value={espera} /> : null}
          <Dato
            label="Herramienta"
            value={HERRAMIENTA_LABEL[orden.herramienta]}
          />
        </dl>

        <p className="max-w-2xl text-sm text-muted">
          La orden se emite en el escritorio y la aplicación se hace recién a las{" "}
          <span className="num text-ink">{formatHora(orden.fechaTarea)}</span>,
          de madrugada o de noche, que es cuando no hay viento. Ese hueco entre
          emitir y ejecutar es el que hoy se completa a mano, de memoria, al
          volver del campo.
        </p>
      </section>

      <section aria-labelledby="lineas-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="lineas-heading" className="font-semibold text-ink">
            Líneas de insumo
          </h2>
          <p className="mt-0.5 max-w-2xl text-sm text-muted">
            El uso total y el costo no están guardados: son dosis por hectárea
            por la superficie de la parcela, y eso por el precio del catálogo.
          </p>
        </div>

        {orden.lineas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-5 text-sm text-muted">
            Esta orden no tiene líneas de insumo cargadas.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[46rem] text-sm">
              <caption className="sr-only">
                Insumos de la orden N.º {orden.numero}
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Marca
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Principio activo
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Categoría
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Dosis/ha
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Uso total
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Costo (U$S)
                  </th>
                </tr>
              </thead>
              <tbody>
                {orden.lineas.map((linea) => (
                  <tr
                    key={linea.id}
                    className="border-b border-border last:border-0 hover:bg-bg"
                  >
                    <td className="px-3 py-2.5 font-medium text-ink">
                      {linea.marca}
                    </td>
                    <td className="px-3 py-2.5 text-muted">
                      {linea.principioActivo}
                    </td>
                    <td className="px-3 py-2.5 text-ink">
                      {CATEGORIA_LABEL[linea.categoria]}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-ink">
                      {formatNumero(linea.dosisHa, 2)} {linea.unidad}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-ink">
                      {formatHa(linea.totalUso)} {unidadTotal(linea.unidad)}
                    </td>
                    <td className="num px-3 py-2.5 text-right font-medium text-ink">
                      {formatUsd(linea.costoUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-bg/60 font-medium">
                  <td className="px-3 py-2.5 text-ink" colSpan={5}>
                    Total de la orden
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink">
                    {formatUsd(orden.costoTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {orden.observaciones ? (
        <section
          aria-labelledby="observaciones-heading"
          className="flex flex-col gap-2"
        >
          <h2
            id="observaciones-heading"
            className="flex items-center gap-2 font-semibold text-ink"
          >
            <Note size={20} className="text-accent" aria-hidden />
            Observaciones
          </h2>
          <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink">
            {orden.observaciones}
          </p>
        </section>
      ) : null}
    </div>
  );
}
