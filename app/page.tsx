import { Suspense } from "react";
import {
  ArrowRight,
  ArrowsLeftRight,
  ChartBar,
  ChatCircleDots,
  Warehouse,
  Warning,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { detectarDiscrepancias, getMovimientos, getStock } from "@/lib/actions";
import { getIndicadores } from "@/lib/actions/indicadores";
import { formatNumero, formatPct } from "@/lib/indicadores";
import { PageHeader, Section, type Stat } from "./components/Page";
import { MovementsTable } from "./components/MovementsTable";
import { formatEntero } from "./components/format";

/** Cuántos movimientos entran en la tarjeta del resumen. Es un vistazo, no la
 *  lista: el historial completo vive en /movimientos. */
const ULTIMOS_MOVIMIENTOS = 8;

export default function Page() {
  return (
    <Suspense fallback={<ResumenSkeleton />}>
      <Resumen />
    </Suspense>
  );
}

async function Resumen() {
  const [stock, discrepancias, indicadores, movimientos] = await Promise.all([
    getStock(),
    detectarDiscrepancias(),
    getIndicadores(),
    getMovimientos(ULTIMOS_MOVIMIENTOS),
  ]);

  const totalKg = stock.reduce((sum, entry) => sum + entry.totalKg, 0);
  const totalBolsas = stock.reduce((sum, entry) => sum + entry.totalBolsas, 0);
  const { totales } = indicadores;

  const stats: Stat[] = [
    {
      label: "Stock disponible",
      value: formatEntero(totalKg),
      unit: "kg",
      hint: `${formatEntero(totalBolsas)} bolsas en ${stock.length} ubicaciones`,
    },
    {
      label: "Discrepancias",
      value: String(discrepancias.length),
      hint: discrepancias.length === 0 ? "conteo al día" : "revisar conteo",
    },
    {
      label: "Producción",
      value: formatNumero(totales.produccionKg),
      unit: "kg",
      hint: `${totales.parcelas} parcelas cosechadas`,
    },
    {
      label: "Rendimiento",
      value: formatNumero(totales.rendimientoKgHa),
      unit: "kg/ha",
      hint: "kilos totales sobre hectáreas totales",
    },
    {
      label: "Exportación",
      value: formatPct(totales.pctExportacion),
      hint: `${formatNumero(totales.kgExportacion)} kg`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Resumen"
        description="Cómo viene la campaña hoy. Ningún número de acá está guardado en una tabla: todos salen de los movimientos y las parcelas cargadas."
        stats={stats}
      />

      <Section
        id="asistente"
        title="Asistente"
        description="Para las preguntas que no entran en una tarjeta y cruzan más de una vista."
      >
        <AsistenteCard />
      </Section>

      <Section
        id="accesos"
        title="Accesos rápidos"
        description="Las tres vistas del depósito y el detalle de campo."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AccesoCard
            href="/stock"
            icon={Warehouse}
            title="Stock"
            detail={`${formatEntero(totalKg)} kg disponibles`}
          />
          <AccesoCard
            href="/movimientos"
            icon={ArrowsLeftRight}
            title="Movimientos"
            detail="Registrar un remito"
          />
          <AccesoCard
            href="/discrepancias"
            icon={Warning}
            title="Discrepancias"
            detail={
              discrepancias.length === 0
                ? "Sin diferencias abiertas"
                : `${discrepancias.length} para revisar`
            }
          />
          <AccesoCard
            href="/indicadores"
            icon={ChartBar}
            title="Indicadores"
            detail={`${formatNumero(totales.rendimientoKgHa)} kg/ha`}
          />
        </div>
      </Section>

      <Section
        id="ultimos-movimientos"
        title="Últimos movimientos"
        description="Lo último que se asentó en el depósito. Es de acá que sale cada número de arriba."
        actions={
          <Link
            href="/movimientos"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent/10"
          >
            Ver movimientos
            <ArrowRight size={16} aria-hidden />
          </Link>
        }
      >
        <MovementsTable movimientos={movimientos} />
      </Section>
    </>
  );
}

/** Invitación al asistente. Describe lo que hace de verdad: consulta el stock
 *  derivado, no adivina ni proyecta. */
function AsistenteCard() {
  return (
    <a
      href="/asistente"
      className="group flex flex-col gap-4 rounded-lg border border-accent/40 bg-surface p-5 transition-colors hover:border-accent sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <ChatCircleDots
          size={26}
          weight="fill"
          className="mt-0.5 shrink-0 text-accent"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="font-medium text-ink">Preguntá en lenguaje natural</p>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Dónde está un lote y de qué parcela salió, qué variedad rindió mejor,
            cuánto se gastó en insumos, qué no cierra en el conteo. Consulta el
            sistema y responde con los mismos números que ves acá.
          </p>
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-accent">
        Abrir asistente
        <ArrowRight
          size={16}
          className="transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </a>
  );
}

function AccesoCard({
  href,
  icon: Ico,
  title,
  detail,
}: {
  href: string;
  icon: Icon;
  title: string;
  detail: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent"
    >
      <Ico size={20} className="text-accent" aria-hidden />
      <span className="font-medium text-ink">{title}</span>
      <span className="text-sm text-muted">{detail}</span>
    </a>
  );
}

function ResumenSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando resumen</span>

      <div className="flex flex-col gap-5 border-b border-border pb-6">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-8 w-20" />
            </div>
          ))}
        </div>
      </div>

      <div className="skeleton h-28 w-full" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-28 w-full" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-64 w-full" />
      </div>
    </div>
  );
}
