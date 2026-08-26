import { Suspense } from "react";
import { getStock } from "@/lib/actions";
import { DashboardSkeleton } from "@/app/components/DashboardSkeleton";
import { EmptyState, PageHeader, Section, type Stat } from "@/app/components/Page";
import { QuerySelect } from "@/app/components/QuerySelect";
import { StockGrid } from "@/app/components/StockGrid";
import { ExportLink } from "@/app/components/ExportLink";
import { formatEntero } from "@/app/components/format";
import { resolverUbicacion } from "@/lib/stock-ubicacion";

type SearchParams = Promise<{ ubicacion?: string | string[] }>;

function primerValor(valor: string | string[] | undefined): string | undefined {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  return crudo?.trim() || undefined;
}

export default function StockPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Stock searchParams={searchParams} />
    </Suspense>
  );
}

async function Stock({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const stock = await getStock();
  const seleccionada = resolverUbicacion(stock, primerValor(params.ubicacion));

  const stats: Stat[] = seleccionada
    ? [
        {
          label: "Stock",
          value: formatEntero(seleccionada.totalKg),
          unit: "kg",
          hint: seleccionada.location.nombre,
        },
        { label: "Bolsas", value: formatEntero(seleccionada.totalBolsas) },
        {
          label: "Partidas",
          value: String(seleccionada.rows.length),
          hint: "combinaciones de variedad y lote",
        },
      ]
    : [];

  const queryExport = seleccionada
    ? new URLSearchParams({ ubicacion: seleccionada.location.id }).toString()
    : undefined;

  return (
    <>
      <PageHeader
        title="Stock"
        description="El stock no se declara: se deriva de los movimientos registrados. Una salida nunca puede superar lo disponible en el origen."
        stats={stats}
        actions={
          seleccionada ? <ExportLink tipo="stock" query={queryExport} /> : null
        }
      />

      <Section
        id="ubicaciones"
        title="Stock por ubicación"
        description="Kilos disponibles hoy en el depósito elegido, abiertos por variedad y lote. El Excel baja esa misma ubicación."
        actions={
          stock.length > 1 ? (
            <QuerySelect
              action="/stock"
              name="ubicacion"
              label="Ubicación"
              hideLabel
              value={seleccionada?.location.id ?? ""}
              options={stock.map((s) => ({
                value: s.location.id,
                label: s.location.nombre,
              }))}
            />
          ) : null
        }
      >
        {stock.length === 0 || !seleccionada ? (
          <EmptyState
            title="Todavía no hay stock"
            description="En cuanto se registre el primer movimiento de ingreso, la ubicación de destino aparece acá con sus kilos."
          />
        ) : (
          <StockGrid stock={[seleccionada]} />
        )}
      </Section>
    </>
  );
}
