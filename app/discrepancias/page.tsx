import { Suspense } from "react";
import { detectarDiscrepancias } from "@/lib/actions";
import { getUbicacionesPropias } from "@/lib/actions/altas";
import { ConteoForm } from "@/app/components/ConteoForm";
import { DiscrepanciesPanel } from "@/app/components/DiscrepanciesPanel";
import { PageHeader, Section, type Stat } from "@/app/components/Page";
import { formatEntero } from "@/app/components/format";

export default function DiscrepanciasPage() {
  return (
    <Suspense fallback={<DiscrepanciasSkeleton />}>
      <Discrepancias />
    </Suspense>
  );
}

async function Discrepancias() {
  const [discrepancias, ubicacionesPropias] = await Promise.all([
    detectarDiscrepancias(),
    getUbicacionesPropias(),
  ]);

  const diferenciaKg = discrepancias.reduce(
    (sum, item) => sum + Math.abs(item.diffKg),
    0,
  );
  const ubicacionesAfectadas = new Set(
    discrepancias.map((item) => item.locationId),
  ).size;

  const stats: Stat[] = [
    {
      label: "Discrepancias",
      value: String(discrepancias.length),
      hint: discrepancias.length === 0 ? "conteo al día" : "revisar conteo",
    },
    {
      label: "Diferencia acumulada",
      value: formatEntero(diferenciaKg),
      unit: "kg",
      hint: "en valor absoluto, faltantes y sobrantes juntos",
    },
    {
      label: "Ubicaciones afectadas",
      value: String(ubicacionesAfectadas),
      hint: `de ${ubicacionesPropias.length} depósitos propios`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Discrepancias"
        description="Lo que dicen los movimientos contra lo que se contó parado en el depósito. Mientras nadie cuente, no hay diferencia que mostrar."
        stats={stats}
      />

      {/* El conteo va antes que el panel: la diferencia no existe hasta que
          alguien carga lo que contó. */}
      <Section
        id="cargar-conteo"
        title="Cargar conteo físico"
        description="Lo que se contó parado en el depósito. Es el único dato que el sistema no puede derivar solo, y es lo que hace visible una diferencia."
        emphasis
      >
        <ConteoForm ubicaciones={ubicacionesPropias} />
      </Section>

      <Section
        id="discrepancias"
        title="Discrepancias de inventario"
        description="Diferencia entre lo que dicen los movimientos y lo que se contó físicamente en el depósito."
      >
        <DiscrepanciesPanel items={discrepancias} />
      </Section>
    </>
  );
}

function DiscrepanciasSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando discrepancias</span>

      <div className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-4 w-80" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="skeleton h-6 w-52" />
        <div className="skeleton h-72 w-full" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="skeleton h-6 w-60" />
        <div className="skeleton h-32 w-full" />
      </div>
    </div>
  );
}
