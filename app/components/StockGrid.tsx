import type { StockPorUbicacion } from "@/lib/types";
import { LocationCard } from "./LocationCard";

type Props = {
  stock: StockPorUbicacion[];
};

const DELAYS = [
  "reveal",
  "reveal reveal-delay-1",
  "reveal reveal-delay-2",
  "reveal reveal-delay-3",
] as const;

export function StockGrid({ stock }: Props) {
  return (
    <section aria-labelledby="stock-heading" className="flex flex-col gap-3">
      <h2 id="stock-heading" className="text-lg font-semibold text-ink">
        Ubicaciones propias
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {stock.map((entry, i) => (
          <LocationCard
            key={entry.location.id}
            name={entry.location.nombre}
            data={entry}
            delayClass={DELAYS[i % DELAYS.length]}
          />
        ))}
      </div>
    </section>
  );
}
