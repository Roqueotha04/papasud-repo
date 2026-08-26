import { ArrowDown, ArrowUp, Info } from "@phosphor-icons/react/ssr";
import type { ParcelaMuestreosDTO } from "@/lib/actions/muestreos";
import { formatNumeroProy } from "@/lib/proyeccion";
import { formatKg } from "./format";

// Contraste proyectado vs real de exportación, por parcela. Vive separado de
// MuestreosPanel porque responde otra pregunta: no "qué muestreé" sino
// "cuánto de exportación voy a tener y le acertó el muestreo".

/** Desvío, en puntos porcentuales, a partir del cual la parcela se destaca. */
const UMBRAL_DESVIO_PTS = 10;

export type FilaProyeccion = {
  parcelaId: string;
  codigo: string;
  variedad: string;
  superficieHa: number;
  /** Un renglón por muestreo: el ensayo con y sin tratamiento se lee separado. */
  proyecciones: { label: string; pct: number; fecha: string; vigente: boolean }[];
  proyectadoPct: number;
  /** Fecha del muestreo (o del ensayo) del que sale `proyectadoPct`. */
  fechaProyeccion: string | null;
  /** null cuando la parcela todavía no tuvo movimientos de ingreso. */
  realPct: number | null;
  totalKgIngreso: number;
  kgExportacion: number;
  /** real - proyectado, en puntos. null cuando no hay real contra qué comparar. */
  desvioPts: number | null;
};

/**
 * Deriva las filas de contraste a partir de lo que ya trae `getMuestreos()`.
 * Se exporta para que la página pueda ordenar, partir y resumir sin repetir
 * el cálculo.
 */
export function filasProyeccion(parcelas: ParcelaMuestreosDTO[]): FilaProyeccion[] {
  return parcelas.map((p) => {
    // Una parcela puede tener muestreos por dos motivos distintos y no se
    // resumen igual. Si son del mismo día, es un ensayo (Rootex contra
    // testigo) y hay que promediarlos: los dos describen la misma cosecha.
    // Si son de días distintos, es la misma parcela muestreada dos veces
    // mientras engordaba, y ahí promediar mezcla una foto vieja con una
    // nueva. Vale la última, que es la que va a parecerse a la cosecha.
    const fechaVigente = p.muestreos.reduce<string | null>(
      (max, m) => (max === null || m.fecha > max ? m.fecha : max),
      null,
    );

    const proyecciones = p.muestreos.map((m) => ({
      label: m.tratamiento ?? "Sin tratamiento",
      pct: m.proyeccion.comercial.pctExportacion,
      fecha: m.fecha,
      vigente: m.fecha === fechaVigente,
    }));

    const vigentes = proyecciones.filter((x) => x.vigente);
    const proyectadoPct =
      vigentes.length > 0
        ? vigentes.reduce((s, x) => s + x.pct, 0) / vigentes.length
        : 0;

    const realPct = p.real.pctExportacion;

    return {
      parcelaId: p.parcelaId,
      codigo: p.codigo,
      variedad: p.variedad,
      superficieHa: p.superficieHa,
      proyecciones,
      proyectadoPct,
      fechaProyeccion: fechaVigente,
      realPct,
      totalKgIngreso: p.real.totalKgIngreso,
      kgExportacion: p.real.kgExportacion,
      desvioPts: realPct === null ? null : realPct - proyectadoPct,
    };
  });
}

/** Formatea un desvío en puntos con signo explícito. */
export function formatPuntos(pts: number): string {
  const signo = pts > 0 ? "+" : "";
  return `${signo}${formatNumeroProy(pts)}`;
}

export function ProyeccionPanel({ filas }: { filas: FilaProyeccion[] }) {
  return (
    <div className="flex flex-col gap-4">
      {filas.map((fila, i) => (
        <ParcelaProyeccionCard
          key={fila.parcelaId}
          fila={fila}
          delayClass={i === 0 ? "reveal" : `reveal reveal-delay-${Math.min(i, 3)}`}
        />
      ))}
    </div>
  );
}

export function ParcelaProyeccionCard({
  fila,
  delayClass,
}: {
  fila: FilaProyeccion;
  delayClass?: string;
}) {
  const destacada = fila.desvioPts !== null && Math.abs(fila.desvioPts) >= UMBRAL_DESVIO_PTS;

  return (
    <article
      aria-labelledby={`proy-${fila.parcelaId}-heading`}
      className={`flex flex-col gap-3 rounded-lg border bg-surface p-4 shadow-card ${
        destacada ? "border-danger/40" : "border-border"
      } ${delayClass ?? ""}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border pb-3">
        <div className="flex items-baseline gap-2">
          <h3
            id={`proy-${fila.parcelaId}-heading`}
            className="text-base font-semibold text-ink"
          >
            Parcela {fila.codigo}
          </h3>
          <span className="text-sm capitalize text-muted">{fila.variedad}</span>
          <span className="num text-sm text-muted">
            {formatNumeroProy(fila.superficieHa, 2)} ha
          </span>
        </div>
        <DesvioChip pts={fila.desvioPts} destacada={destacada} />
      </header>

      <div className="flex flex-col gap-1.5">
        {fila.proyecciones.map((p) => (
          <BarraComparacion
            key={`${p.fecha}-${p.label}`}
            label={
              fila.proyecciones.length > 1
                ? `Proyectado (${p.label})`
                : "Proyectado (muestreo)"
            }
            pct={p.pct}
            tono={p.vigente ? "proyectado" : "superado"}
          />
        ))}
        {fila.proyecciones.some((p) => !p.vigente) ? (
          <p className="pt-0.5 text-xs text-muted">
            El desvío se mide contra el muestreo más reciente. Los anteriores
            quedan como historia del engorde, no se promedian con el último.
          </p>
        ) : null}
        {fila.realPct === null ? (
          <p className="pt-1 text-xs text-muted">
            Real: todavía no hay movimientos de ingreso registrados para esta parcela,
            así que no hay contra qué contrastar la proyección.
          </p>
        ) : (
          <BarraComparacion
            label="Real (movimientos)"
            pct={fila.realPct}
            tono="real"
          />
        )}
      </div>

      {fila.realPct !== null ? (
        <p className="text-xs text-muted">
          Ingresaron <span className="num text-ink">{formatKg(fila.totalKgIngreso)} kg</span>{" "}
          de esta parcela, de los cuales{" "}
          <span className="num text-ink">{formatKg(fila.kgExportacion)} kg</span> terminaron
          clasificados como exportación.
        </p>
      ) : null}

      {fila.realPct === 0 && fila.totalKgIngreso > 0 ? (
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            De los {formatKg(fila.totalKgIngreso)} kg ingresados todavía no salió nada
            clasificado como exportación. La categoría comercial se asigna recién después
            de tamañar, en los movimientos posteriores: mientras esa partida no se procese,
            el real queda en 0% por falta de clasificación, no porque la parcela no vaya a
            dar exportación.
          </span>
        </p>
      ) : null}
    </article>
  );
}

function DesvioChip({ pts, destacada }: { pts: number | null; destacada: boolean }) {
  if (pts === null) {
    return (
      <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-xs text-muted">
        Sin contraste
      </span>
    );
  }

  const Flecha = pts < 0 ? ArrowDown : ArrowUp;
  const tono = destacada
    ? "border-danger/40 bg-danger-bg text-danger"
    : "border-border bg-bg text-ink";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tono}`}
    >
      <Flecha size={12} weight="bold" aria-hidden />
      <span className="num">{formatPuntos(pts)} pts</span>
      <span className="font-normal">
        {pts < 0 ? "bajo lo proyectado" : "sobre lo proyectado"}
      </span>
    </span>
  );
}

function BarraComparacion({
  label,
  pct,
  tono,
}: {
  label: string;
  pct: number;
  tono: "proyectado" | "real" | "superado";
}) {
  const color =
    tono === "real"
      ? "bg-accent-strong"
      : tono === "superado"
        ? "bg-border"
        : "bg-accent/60";
  return (
    <div
      className={`flex items-center gap-2 text-xs ${tono === "superado" ? "opacity-60" : ""}`}
    >
      <span className="w-40 shrink-0 text-muted">{label}</span>
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-border/50"
        role="img"
        aria-label={`${label}: ${formatNumeroProy(pct)}% de exportación`}
      >
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="num w-14 shrink-0 text-right text-ink">
        {formatNumeroProy(pct)}%
      </span>
    </div>
  );
}
