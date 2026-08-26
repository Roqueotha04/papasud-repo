import { Suspense } from "react";
import { getStock } from "@/lib/actions";
import { DashboardSkeleton } from "@/app/components/DashboardSkeleton";
import { EmptyState, PageHeader, Section, type Stat } from "@/app/components/Page";
import { StockGrid } from "@/app/components/StockGrid";
import { ExportLink } from "@/app/components/ExportLink";
import { formatEntero } from "@/app/components/format";

export default function StockPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Stock />
    </Suspense>
  );
}

async function Stock() {
  const stock = await getStock();

  const totalKg = stock.reduce((sum, entry) => sum + entry.totalKg, 0);
  const totalBolsas = stock.reduce((sum, entry) => sum + entry.totalBolsas, 0);
  const partidas = stock.reduce((sum, entry) => sum + entry.rows.length, 0);

  const stats: Stat[] = [
    { label: "Stock total", value: formatEntero(totalKg), unit: "kg" },
    { label: "Bolsas", value: formatEntero(totalBolsas) },
    {
      label: "Partidas",
      value: String(partidas),
      hint: "combinaciones de variedad y lote",
    },
    {
      label: "Ubicaciones",
      value: String(stock.length),
      hint: "depósitos propios",
    },
  ];

  return (
    <>
      <PageHeader
        title="Stock"
        description="El stock no se declara: se deriva de los movimientos registrados. Una salida nunca puede superar lo disponible en el origen."
        stats={stats}
        actions={<ExportLink tipo="stock" />}
      />

      <Section
        id="ubicaciones"
        title="Stock por ubicación"
        description="Kilos disponibles hoy en cada depósito propio, abiertos por variedad y lote."
      >
        {stock.length === 0 ? (
          <EmptyState
            title="Todavía no hay stock"
            description="En cuanto se registre el primer movimiento de ingreso, la ubicación de destino aparece acá con sus kilos."
          />
        ) : (
          <StockGrid stock={stock} />
        )}
      </Section>
    </>
  );
}
