import Link from "next/link";
import {
  ArrowLeft,
  ChartBar,
  ClipboardText,
  Flask,
  Info,
  MapPin,
  Package,
  Truck,
  Warning,
} from "@phosphor-icons/react/ssr";
import type {
  ClaseCalibre,
  ParcelaFicha as ParcelaFichaData,
} from "@/lib/actions/parcelas";

type Props = {
  ficha: ParcelaFichaData;
};

// ---------- formateo es-AR, helpers propios de esta ficha ----------

function formatKg(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function formatEntero(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function formatPct(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
}

function formatHa(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

const TIPO_LABELS: Record<string, string> = {
  INGRESO_TOLVAS: "Ingreso a tolvas",
  INGRESO_TREVELIN: "Ingreso a Trevelín",
  CAMPO_A_FRIO: "Campo a frío",
};

const CLASE_LABELS: Record<ClaseCalibre, string> = {
  exportacion: "Exportación",
  sin_chicas: "Sin chicas",
  descarte_semilla: "Descarte / semilla",
};

const CLASE_BAR_CLASS: Record<ClaseCalibre, string> = {
  exportacion: "bg-accent-strong",
  sin_chicas: "bg-accent",
  descarte_semilla: "bg-muted",
};

function StatTile({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="num mt-0.5 text-2xl font-medium tracking-tight text-ink">
        {value}
        {suffix ? (
          <span className="text-base font-normal text-muted"> {suffix}</span>
        ) : null}
      </dd>
    </div>
  );
}

export function ParcelaFicha({ ficha }: Props) {
  const tieneIngresos = ficha.kgTotal > 0;

  return (
    <div className="flex flex-col gap-10">
      <Link
        href="/parcelas"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden />
        Volver al listado
      </Link>

      {/* 1. Cabecera */}
      <header className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MapPin size={26} weight="fill" className="shrink-0 text-accent" aria-hidden />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
                Parcela {ficha.codigo}
              </h1>
              <p className="mt-0.5 text-sm capitalize text-muted">
                {ficha.variedad} · campaña {ficha.campaniaNombre}
              </p>
            </div>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <StatTile label="Superficie" value={formatHa(ficha.superficieHa)} suffix="ha" />
          {ficha.pivote ? (
            <StatTile label="Pivote" value={ficha.pivote} />
          ) : null}
          {ficha.tercio != null ? (
            <StatTile label="Tercio" value={formatEntero(ficha.tercio)} />
          ) : null}
          <StatTile label="Campaña" value={ficha.campaniaNombre} />
        </dl>
      </header>

      {/* 2. Producción real */}
      <section aria-labelledby="produccion-heading" className="flex flex-col gap-3">
        <h2
          id="produccion-heading"
          className="flex items-center gap-2 text-lg font-semibold text-ink"
        >
          <Package size={20} className="text-accent" aria-hidden />
          Producción real
        </h2>

        {tieneIngresos ? (
          <div className="rounded-lg border border-border bg-surface p-5">
            <dl className="flex flex-wrap gap-x-10 gap-y-4">
              <StatTile label="Kg totales" value={formatKg(ficha.kgTotal)} suffix="kg" />
              <StatTile label="Bolsas" value={formatEntero(ficha.bolsasTotal)} />
              <StatTile
                label="Rendimiento"
                value={formatKg(ficha.rendimientoKgHa)}
                suffix="kg/ha"
              />
              <StatTile
                label="% exportación (real)"
                value={
                  ficha.pctExportacionReal == null
                    ? "Sin datos"
                    : `${formatPct(ficha.pctExportacionReal)}%`
                }
              />
            </dl>
            {ficha.pctExportacionReal === 0 ? (
              <p className="mt-4 flex items-start gap-2 text-xs text-muted">
                <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
                Los movimientos de ingreso desde el campo de esta parcela no traen
                cargada la categoría de exportación: esa categoría se define más
                adelante en la cadena (envío a frío / entrega a cliente), que ya no
                queda atada a la parcela de origen.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-surface px-4 py-5">
            <Warning size={22} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="font-medium text-ink">
                Todavía no hay ingresos registrados para esta parcela
              </p>
              <p className="mt-0.5 text-sm text-muted">
                No se contabilizó ningún movimiento de campo (tolvas, Trevelín o
                campo a frío) con esta parcela como origen.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 3. Proyección pre-cosecha */}
      <section aria-labelledby="proyeccion-heading" className="flex flex-col gap-3">
        <h2
          id="proyeccion-heading"
          className="flex items-center gap-2 text-lg font-semibold text-ink"
        >
          <Flask size={20} className="text-accent" aria-hidden />
          Proyección pre-cosecha
        </h2>

        {ficha.muestreos.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-surface px-4 py-5">
            <Flask size={22} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="font-medium text-ink">
                Esta parcela no tiene muestreo pre-cosecha cargado
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Sin muestreo no hay forma de proyectar la distribución de
                calibres antes de cosechar. Sólo se puede ver la producción
                real, más arriba.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="flex items-start gap-2 text-xs text-muted">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
              La proyección extrapola una muestra de un puñado de plantas
              (~150-215 tubérculos por muestreo). Es una estimación, no un
              pronóstico exacto: úsala como orden de magnitud.
            </p>

            {ficha.muestreos.map((m) => (
              <div key={m.id} className="rounded-lg border border-border bg-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium text-ink">
                    Muestreo del {formatFecha(m.fecha)}
                    {m.tratamiento ? (
                      <span className="ml-2 text-sm font-normal text-muted">
                        {m.tratamiento}
                      </span>
                    ) : null}
                  </h3>
                  <p className="num text-sm text-muted">
                    {formatKg(m.pesoTotalKg)} kg · {formatEntero(m.nTuberculos)} tubérculos
                  </p>
                </div>

                {/* Barra de distribución de calibre por peso */}
                <div
                  className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-bg"
                  role="img"
                  aria-label={`Distribución de calibre: ${formatPct(m.pctExportacion)}% exportación, ${formatPct(m.pctSinChicas)}% sin chicas, ${formatPct(m.pctDescarteSemilla)}% descarte o semilla`}
                >
                  <div
                    className={CLASE_BAR_CLASS.exportacion}
                    style={{ width: `${m.pctExportacion}%` }}
                  />
                  <div
                    className={CLASE_BAR_CLASS.sin_chicas}
                    style={{ width: `${m.pctSinChicas}%` }}
                  />
                  <div
                    className={CLASE_BAR_CLASS.descarte_semilla}
                    style={{ width: `${m.pctDescarteSemilla}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-ink">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent-strong" aria-hidden />
                    Exportación <span className="num font-medium">{formatPct(m.pctExportacion)}%</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-ink">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden />
                    Sin chicas <span className="num font-medium">{formatPct(m.pctSinChicas)}%</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-ink">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted" aria-hidden />
                    Descarte / semilla{" "}
                    <span className="num font-medium">{formatPct(m.pctDescarteSemilla)}%</span>
                  </span>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[26rem] text-sm">
                    <caption className="sr-only">
                      Desglose de calibres del muestreo del {formatFecha(m.fecha)}
                    </caption>
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th scope="col" className="py-1.5 pr-3 font-medium">
                          Rango
                        </th>
                        <th scope="col" className="py-1.5 pr-3 font-medium">
                          Salida
                        </th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                          Peso
                        </th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                          % en peso
                        </th>
                        <th scope="col" className="py-1.5 text-right font-medium">
                          Cantidad
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.calibres.map((c) => (
                        <tr key={c.rango} className="border-b border-border last:border-0">
                          <td className="num py-1.5 pr-3 text-ink">{c.rango} mm</td>
                          <td className="py-1.5 pr-3 text-ink">{CLASE_LABELS[c.clase]}</td>
                          <td className="num py-1.5 pr-3 text-right text-ink">
                            {formatKg(c.pesoKg)} kg
                          </td>
                          <td className="num py-1.5 pr-3 text-right text-ink">
                            {formatPct(c.pctPesoMuestra)}%
                          </td>
                          <td className="num py-1.5 text-right text-ink">
                            {formatEntero(c.cantidad)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* El remate: proyectado vs real */}
            {ficha.proyeccion ? (
              <div className="rounded-lg border border-accent-strong bg-surface p-5">
                <h3 className="flex items-center gap-2 font-medium text-ink">
                  <ChartBar size={18} className="text-accent" aria-hidden />
                  Proyectado vs. real
                </h3>
                <div className="mt-3 flex flex-wrap gap-x-10 gap-y-4">
                  <StatTile
                    label="% exportación proyectado (muestreo)"
                    value={`${formatPct(ficha.proyeccion.pctExportacion)}%`}
                  />
                  <StatTile
                    label="% exportación real (movimientos)"
                    value={
                      ficha.pctExportacionReal == null
                        ? "Sin datos"
                        : `${formatPct(ficha.pctExportacionReal)}%`
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* 4. Trazabilidad */}
      <section aria-labelledby="trazabilidad-heading" className="flex flex-col gap-3">
        <h2
          id="trazabilidad-heading"
          className="flex items-center gap-2 text-lg font-semibold text-ink"
        >
          <Truck size={20} className="text-accent" aria-hidden />
          Trazabilidad
        </h2>

        {ficha.movimientos.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-surface px-4 py-5">
            <ClipboardText size={22} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <p className="text-sm text-muted">
              No hay movimientos de ingreso desde el campo para esta parcela.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[48rem] text-sm">
              <caption className="sr-only">
                Movimientos de ingreso de la parcela {ficha.codigo}
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Remito
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
                {ficha.movimientos.map((mov) => {
                  const kg = mov.items.reduce((sum, item) => sum + item.kg, 0);
                  const lotes =
                    mov.items.length === 0
                      ? "Sin ítems"
                      : mov.items
                          .map((item) => `${item.variedad} · ${item.lote}`)
                          .join(", ");
                  return (
                    <tr key={mov.id} className="border-b border-border last:border-0 hover:bg-bg">
                      <td className="num whitespace-nowrap px-3 py-2.5 text-ink">
                        {formatFecha(mov.fecha)}
                      </td>
                      <td className="num px-3 py-2.5 text-ink">{mov.remito ?? "-"}</td>
                      <td className="px-3 py-2.5 text-ink">
                        {TIPO_LABELS[mov.tipo] ?? mov.tipo}
                      </td>
                      <td className="px-3 py-2.5 text-ink">
                        {mov.origenNombre} → {mov.destinoNombre}
                      </td>
                      <td
                        className="max-w-[16rem] truncate px-3 py-2.5 capitalize text-ink"
                        title={lotes}
                      >
                        {lotes}
                      </td>
                      <td className="num px-3 py-2.5 text-right text-ink">{formatKg(kg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
