import { OrdenTrabajoForm } from "@/app/components/OrdenTrabajoForm";
import { PageHeader, Section, type Stat } from "@/app/components/Page";
import { WorkOrdersTable } from "@/app/components/WorkOrdersTable";
import { getInsumosSelect, getParcelasSelect } from "@/lib/actions/altas";
import { formatHa, formatUsd, getOrdenes, getResumenOrdenes } from "@/lib/ordenes";

export default async function OrdenesPage() {
  // getResumenOrdenes() sigue acá solo por las stats del encabezado: el desglose
  // de costo por parcela y por categoría se mudó a /indicadores, que es donde
  // el costo se puede leer contra la producción de esa misma parcela.
  const [ordenes, resumen, parcelas, insumos] = await Promise.all([
    getOrdenes(),
    getResumenOrdenes(),
    getParcelasSelect(),
    getInsumosSelect(),
  ]);

  const stats: Stat[] = [
    { label: "Órdenes", value: String(resumen.ordenes) },
    { label: "Aplicaciones", value: String(resumen.aplicaciones) },
    { label: "Costo total", value: formatUsd(resumen.costoTotal), unit: "U$S" },
    {
      label: "Hectáreas cubiertas",
      value: formatHa(resumen.hectareasCubiertas),
      unit: "ha",
      hint: `${resumen.parcelasConOrden} parcelas`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Órdenes de trabajo"
        description="Qué se aplicó, en qué parcela, cuándo y con qué insumos. Cada línea lleva su dosis por hectárea y su costo, calculado contra el catálogo de precios."
        stats={stats}
      />

      <Section
        id="cargar-orden"
        title="Cargar orden de trabajo"
        description="El costo se calcula mientras se carga: dosis por hectárea, por la superficie de la parcela, por el precio del insumo. Se ve lo que sale la aplicación antes de emitirla."
        emphasis
      >
        <OrdenTrabajoForm parcelas={parcelas} insumos={insumos} />
      </Section>

      <Section
        id="detalle"
        title="Detalle por orden"
        description="Cada orden con sus líneas de insumo, dosis, uso total y herramienta. La fecha de emisión y la de tarea son distintas: la aplicación se hace de madrugada o de noche, cuando no hay viento."
        actions={
          <a
            href="/indicadores#costo-por-parcela"
            className="text-sm font-medium text-accent-strong underline-offset-2 transition-colors hover:underline"
          >
            Costo por parcela y por insumo →
          </a>
        }
      >
        <WorkOrdersTable ordenes={ordenes} />
      </Section>
    </>
  );
}
