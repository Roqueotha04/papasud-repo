import { Suspense } from "react";
import { getLocations, getMovimientos } from "@/lib/actions";
import { MovementForm } from "@/app/components/MovementForm";
import { MovementsTable } from "@/app/components/MovementsTable";
import { PageHeader, Section, type Stat } from "@/app/components/Page";
import { ExportLink } from "@/app/components/ExportLink";
import { formatEntero } from "@/app/components/format";

const LIMITE = 50;

export default function MovimientosPage() {
  return (
    <Suspense fallback={<MovimientosSkeleton />}>
      <Movimientos />
    </Suspense>
  );
}

async function Movimientos() {
  const [locations, movimientos] = await Promise.all([
    getLocations(),
    getMovimientos(LIMITE),
  ]);

  const kgMovidos = movimientos.reduce(
    (sum, mov) => sum + mov.items.reduce((acc, item) => acc + item.kg, 0),
    0,
  );
  const conRemito = movimientos.filter((mov) => mov.remito).length;

  const stats: Stat[] = [
    {
      label: "Movimientos",
      value: String(movimientos.length),
      hint: `los ${LIMITE} más recientes`,
    },
    {
      label: "Kilos movidos",
      value: formatEntero(kgMovidos),
      unit: "kg",
      hint: "en los movimientos listados",
    },
    {
      label: "Con remito",
      value: String(conRemito),
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

      {/* El formulario primero y a la izquierda: es la acción de la página, la
          tabla es la consecuencia. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
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
          title="Últimos movimientos"
          description={`Los ${movimientos.length} remitos más recientes, con su origen y destino.`}
        >
          <MovementsTable movimientos={movimientos} />
        </Section>
      </div>
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-96 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
