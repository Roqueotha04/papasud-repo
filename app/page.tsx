import { Suspense } from "react";
import {
  detectarDiscrepancias,
  getLocations,
  getMovimientos,
  getStock,
} from "@/lib/actions";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { DiscrepanciesPanel } from "./components/DiscrepanciesPanel";
import { MovementForm } from "./components/MovementForm";
import { MovementsTable } from "./components/MovementsTable";
import { PageHeader, Section, type Stat } from "./components/Page";
import { StockGrid } from "./components/StockGrid";

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function formatKg(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

async function Dashboard() {
  const [stock, locations, movimientos, discrepancias] = await Promise.all([
    getStock(),
    getLocations(),
    getMovimientos(50),
    detectarDiscrepancias(),
  ]);

  const totalKg = stock.reduce((sum, entry) => sum + entry.totalKg, 0);
  const totalBolsas = stock.reduce((sum, entry) => sum + entry.totalBolsas, 0);
  const partidas = stock.reduce((sum, entry) => sum + entry.rows.length, 0);

  const stats: Stat[] = [
    { label: "Stock total", value: formatKg(totalKg), unit: "kg" },
    { label: "Bolsas", value: formatKg(totalBolsas) },
    {
      label: "Partidas",
      value: String(partidas),
      hint: `en ${stock.length} ubicaciones propias`,
    },
    {
      label: "Discrepancias",
      value: String(discrepancias.length),
      hint: discrepancias.length === 0 ? "conteo al día" : "revisar conteo",
    },
  ];

  return (
    <>
      <PageHeader
        title="Stock y movimientos"
        description="El stock no se declara: se deriva de los movimientos registrados. Una salida nunca puede superar lo disponible en el origen."
        stats={stats}
      />

      <Section
        id="ubicaciones"
        title="Stock por ubicación"
        description="Kilos disponibles hoy en cada depósito propio, abiertos por variedad y lote."
      >
        <StockGrid stock={stock} />
      </Section>

      <Section
        id="discrepancias"
        title="Discrepancias de inventario"
        description="Diferencia entre lo que dicen los movimientos y lo que se contó físicamente en el depósito."
      >
        <DiscrepanciesPanel items={discrepancias} />
      </Section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
        <Section
          id="registrar"
          title="Registrar movimiento"
          description="Un remito puede llevar varias líneas. Se valida el stock del origen antes de asentarlo."
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
