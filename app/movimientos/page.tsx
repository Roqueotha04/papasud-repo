import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp } from "@phosphor-icons/react/ssr";
import { getLocations, getMovimientos } from "@/lib/actions";
import { contarMovimientos } from "@/lib/actions/stock";
import { MovementForm } from "@/app/components/MovementForm";
import { MovementsByDate } from "@/app/components/MovementsByDate";
import { PageHeader, Section, type Stat } from "@/app/components/Page";
import { ExportLink } from "@/app/components/ExportLink";
import { formatEntero } from "@/app/components/format";
import { kgDeMovimiento } from "@/lib/movimientos-por-fecha";

// La página abre con los últimos 10, que es lo que se mira todos los días.
// El histórico completo está a un click, pero no se paga su costo de entrada.
const RECIENTES = 10;
const TODOS = 500;

export default function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  return (
    <Suspense fallback={<MovimientosSkeleton />}>
      <Movimientos searchParams={searchParams} />
    </Suspense>
  );
}

async function Movimientos({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  const verTodos = ver === "todos";
  const limite = verTodos ? TODOS : RECIENTES;

  const [locations, movimientos, total] = await Promise.all([
    getLocations(),
    getMovimientos(limite),
    contarMovimientos(),
  ]);

  const kgMovidos = movimientos.reduce((sum, mov) => sum + kgDeMovimiento(mov), 0);
  const conRemito = movimientos.filter((mov) => mov.remito).length;

  const stats: Stat[] = [
    {
      label: "Movimientos",
      value: formatEntero(total),
      hint: "remitos asentados en total",
    },
    {
      label: verTodos ? "Kilos movidos" : "Kilos recientes",
      value: formatEntero(kgMovidos),
      unit: "kg",
      hint: verTodos
        ? `en los últimos ${movimientos.length} remitos`
        : `en los últimos ${movimientos.length}`,
    },
    {
      label: "Con remito",
      value: `${conRemito} / ${movimientos.length}`,
      hint:
        conRemito === movimientos.length
          ? "todos documentados"
          : `${movimientos.length - conRemito} sin número`,
    },
    {
      label: "Ubicaciones",
      value: String(locations.length),
      hint: "orígenes y destinos disponibles",
    },
  ];

  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Cada remito asentado acá es lo que después sostiene el stock. Nada se carga como saldo: se carga como movimiento."
        stats={stats}
        actions={<ExportLink tipo="movimientos" />}
      />

      {/* El formulario va arriba y a todo el ancho: es la acción de la página.
          La lista es la consecuencia, y va debajo. */}
      <Section
        id="registrar"
        title="Registrar movimiento"
        description="Un remito puede llevar varias líneas. Se valida el stock del origen antes de asentarlo."
        emphasis
      >
        <MovementForm locations={locations} />
      </Section>

      <Section
        id="ultimos"
        title={verTodos ? "Historial de movimientos" : "Últimos movimientos"}
        description={
          verTodos
            ? `Todo el historial, separado por jornada. Se muestran hasta ${TODOS} remitos.`
            : `Los ${movimientos.length} remitos más recientes, separados por jornada.`
        }
        actions={
          total > RECIENTES ? (
            <Link
              href={verTodos ? "/movimientos#ultimos" : "/movimientos?ver=todos#ultimos"}
              scroll={false}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent/10"
            >
              {verTodos ? (
                <>
                  <ArrowUp size={16} aria-hidden />
                  Ver solo los últimos {RECIENTES}
                </>
              ) : (
                <>
                  Ver todos los movimientos
                  <ArrowRight size={16} aria-hidden />
                </>
              )}
            </Link>
          ) : null
        }
      >
        <MovementsByDate movimientos={movimientos} />

        {!verTodos && total > movimientos.length ? (
          <p className="text-sm text-muted">
            Hay {formatEntero(total - movimientos.length)} movimientos más en el
            historial.
          </p>
        ) : null}
      </Section>
    </>
  );
}

function MovimientosSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando movimientos</span>

      <div className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="skeleton h-8 w-52" />
        <div className="skeleton h-4 w-80" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-80 w-full" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-52 w-full" />
        <div className="skeleton h-52 w-full" />
      </div>
    </div>
  );
}
