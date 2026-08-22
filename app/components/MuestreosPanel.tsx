import { Info, Ruler, Scales, TestTube } from "@phosphor-icons/react/ssr";
import type { ParcelaMuestreosDTO, MuestreoDTO } from "@/lib/actions/muestreos";
import type { CalibreDistribucion, ProyeccionComercial } from "@/lib/proyeccion";
import { formatNumeroProy } from "@/lib/proyeccion";
import { formatEntero, formatFecha, formatKg } from "./format";

type Props = {
  parcelas: ParcelaMuestreosDTO[];
};

export function MuestreosPanel({ parcelas }: Props) {
  if (parcelas.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        <TestTube size={22} className="text-accent" aria-hidden />
        <p>Todavía no hay muestreos pre-cosecha cargados.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {parcelas.map((parcela, i) => (
        <ParcelaMuestreoCard
          key={parcela.parcelaId}
          parcela={parcela}
          delayClass={i === 0 ? "reveal" : `reveal reveal-delay-${Math.min(i, 3)}`}
        />
      ))}
    </div>
  );
}

function ParcelaMuestreoCard({
  parcela,
  delayClass,
}: {
  parcela: ParcelaMuestreosDTO;
  delayClass: string;
}) {
  const dosColumnas = parcela.muestreos.length === 2;

  return (
    <section
      aria-labelledby={`parcela-${parcela.parcelaId}-heading`}
      className={`flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card ${delayClass}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-baseline gap-2">
          <h3
            id={`parcela-${parcela.parcelaId}-heading`}
            className="text-base font-semibold text-ink"
          >
            Parcela {parcela.codigo}
          </h3>
          <span className="capitalize text-sm text-muted">{parcela.variedad}</span>
        </div>
        <p className="num text-sm text-muted">
          {formatNumeroProy(parcela.superficieHa, 2)} ha
        </p>
      </header>

      <div
        className={
          dosColumnas
            ? "grid grid-cols-1 gap-4 md:grid-cols-2"
            : "grid grid-cols-1 gap-4"
        }
      >
        {parcela.muestreos.map((m) => (
          <MuestreoCard key={m.id} muestreo={m} />
        ))}
      </div>

      <ProyectadoVsReal parcela={parcela} />
    </section>
  );
}

function MuestreoCard({ muestreo: m }: { muestreo: MuestreoDTO }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-ink">
          {m.tratamiento ?? "Sin tratamiento"}
        </span>
        <span className="text-xs text-muted">{formatFecha(m.fecha)}</span>
      </header>

      <p className="flex items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Scales size={14} aria-hidden />
          <span className="num text-ink">{formatKg(m.pesoTotalKg)} kg</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Ruler size={14} aria-hidden />
          <span className="num text-ink">{formatEntero(m.nTuberculos)}</span> tubérculos
        </span>
      </p>

      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted">
          Distribución por calibre
        </h4>
        {m.proyeccion.distribucionCalibres.map((c) => (
          <CalibreBarra key={c.rango} calibre={c} />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted">
          Proyección comercial
        </h4>
        <ComercialBarra comercial={m.proyeccion.comercial} />
        <ComercialLeyenda comercial={m.proyeccion.comercial} />
      </div>

      <RendimientoBloque muestreo={m} />
    </article>
  );
}

function CalibreBarra({ calibre: c }: { calibre: CalibreDistribucion }) {
  const color =
    c.salida === "EXPORTACION"
      ? "bg-accent-strong"
      : c.salida === "SIN_CHICAS"
        ? "bg-accent/60"
        : "bg-muted/50";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-muted">{c.rango}</span>
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-border/50"
        role="img"
        aria-label={`${c.rango}: ${formatNumeroProy(c.pctPeso)}% del peso de la muestra`}
      >
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, c.pctPeso)}%` }}
        />
      </div>
      <span className="num w-14 shrink-0 text-right text-ink">
        {formatNumeroProy(c.pctPeso)}%
      </span>
    </div>
  );
}

function ComercialBarra({ comercial: c }: { comercial: ProyeccionComercial }) {
  return (
    <div
      className="flex h-3 w-full overflow-hidden rounded-full border border-border"
      role="img"
      aria-label={`Exportación ${formatNumeroProy(c.pctExportacion)}%, sin chicas ${formatNumeroProy(
        c.pctSinChicas,
      )}%, descarte o semilla ${formatNumeroProy(c.pctDescarteSemilla)}%`}
    >
      <div className="bg-accent-strong" style={{ width: `${c.pctExportacion}%` }} />
      <div className="bg-accent/60" style={{ width: `${c.pctSinChicas}%` }} />
      <div className="bg-muted/50" style={{ width: `${c.pctDescarteSemilla}%` }} />
    </div>
  );
}

function ComercialLeyenda({ comercial: c }: { comercial: ProyeccionComercial }) {
  const items: { label: string; pct: number; dot: string }[] = [
    { label: "Exportación", pct: c.pctExportacion, dot: "bg-accent-strong" },
    { label: "Sin chicas", pct: c.pctSinChicas, dot: "bg-accent/60" },
    { label: "Descarte/semilla", pct: c.pctDescarteSemilla, dot: "bg-muted/50" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${it.dot}`} aria-hidden />
          <span>{it.label}</span>
          <span className="num text-ink">{formatNumeroProy(it.pct)}%</span>
        </li>
      ))}
    </ul>
  );
}

function RendimientoBloque({ muestreo: m }: { muestreo: MuestreoDTO }) {
  const r = m.proyeccion.rendimiento;
  if (!r.disponible) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-muted">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>{r.motivo}</span>
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1 text-xs text-muted">
      <p>
        Peso medio del tubérculo:{" "}
        <span className="num text-ink">
          {formatNumeroProy(r.pesoMedioTuberculoKg * 1000, 0)} g
        </span>
      </p>
      {r.kgPorMetroLineal != null && (
        <p>
          Rendimiento estimado:{" "}
          <span className="num text-ink">{formatNumeroProy(r.kgPorMetroLineal, 2)} kg</span>{" "}
          por metro lineal de surco
        </p>
      )}
      <p className="flex items-start gap-1.5">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>{r.nota}</span>
      </p>
    </div>
  );
}

function ProyectadoVsReal({ parcela }: { parcela: ParcelaMuestreosDTO }) {
  const { real } = parcela;
  const filas = parcela.muestreos.map((m) => ({
    label: m.tratamiento ?? "Muestreo",
    pct: m.proyeccion.comercial.pctExportacion,
  }));

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-3">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted">
        Exportación: proyectado vs real
      </h4>
      <div className="flex flex-col gap-1.5">
        {filas.map((f) => (
          <BarraComparacion key={f.label} label={`Proyectado (${f.label})`} pct={f.pct} />
        ))}
        {real.pctExportacion === null ? (
          <p className="text-xs text-muted">
            Real: todavía no hay movimientos de ingreso registrados para esta parcela.
          </p>
        ) : (
          <BarraComparacion label="Real (movimientos)" pct={real.pctExportacion} />
        )}
      </div>
      {real.pctExportacion === 0 && real.totalKgIngreso > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Los {formatKg(real.totalKgIngreso)} kg ingresados de esta parcela todavía no
            tienen categoría de exportación asignada: esa categoría se define recién en
            movimientos posteriores (envío a frío, entrega a cliente), que en el modelo
            actual no quedan vinculados a la parcela de origen. El contraste real da 0%
            por esa razón, no porque no haya salido nada de exportación.
          </span>
        </p>
      )}
    </div>
  );
}

function BarraComparacion({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-40 shrink-0 text-muted">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border/50">
        <div
          className="h-full rounded-full bg-accent-strong"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="num w-14 shrink-0 text-right text-ink">
        {formatNumeroProy(pct)}%
      </span>
    </div>
  );
}
