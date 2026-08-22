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

// Una tarjeta por fila, a lo ancho: las tablas de lote/variedad respiran mucho
// mejor que apretadas en dos columnas, y el orden de lectura es el de la cadena.
export function StockGrid({ stock }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {stock.map((entry, i) => (
        <LocationCard
          key={entry.location.id}
          name={entry.location.nombre}
          data={entry}
          delayClass={DELAYS[i % DELAYS.length]}
        />
      ))}
    </div>
  );
}
