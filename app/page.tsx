import { Suspense } from "react";
import {
  detectarDiscrepancias,
  getLocations,
  getMovimientos,
  getStock,
} from "@/lib/actions";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { DiscrepanciesPanel } from "./components/DiscrepanciesPanel";
import { MovementForm } from "./components/MovementForm";
import { MovementsTable } from "./components/MovementsTable";
import { StockGrid } from "./components/StockGrid";

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const [stock, locations, movimientos, discrepancias] = await Promise.all([
    getStock(),
    getLocations(),
    getMovimientos(50),
    detectarDiscrepancias(),
  ]);

  const totalKg = stock.reduce((sum, entry) => sum + entry.totalKg, 0);

  return (
    <main className="flex flex-col gap-10">
      <DashboardHeader
        totalKg={totalKg}
        movimientosCount={movimientos.length}
      />
      <StockGrid stock={stock} />
      <DiscrepanciesPanel items={discrepancias} />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
        <MovementForm locations={locations} />
        <MovementsTable movimientos={movimientos} />
      </div>
    </main>
  );
}
