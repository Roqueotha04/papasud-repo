import { CalendarBlank, Package } from "@phosphor-icons/react/ssr";
import type { MovimientoDTO } from "@/lib/types";
import {
  agruparPorFecha,
  bolsasDeMovimiento,
  kgDeMovimiento,
} from "@/lib/movimientos-por-fecha";
import { formatEntero, formatKg, movementTypeLabel } from "./format";

// Los movimientos se leen por jornada, no como una lista corrida: la pregunta
// del depósito es "qué se movió el martes", y un remito pertenece a un día.
// Cada fecha es su propia tabla, con su propio total al pie.

const CATEGORIA_LABEL: Record<string, string> = {
  EXPORTACION: "Exportación",
  SIN_CHICAS: "Sin chicas",
  RECIBO: "Recibo",
  GRANEL: "Granel",
  DESCARTE_PARAGUAY: "Descarte Paraguay",
  SOLO_CHASIS: "Solo chasis",
  SEMILLA: "Semilla",
};

function hora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function MovementsByDate({ movimientos }: { movimientos: MovimientoDTO[] }) {
  if (movimientos.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-surface px-4 py-6">
        <Package size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="font-medium text-ink">Todavía no hay movimientos</p>
          <p className="mt-0.5 text-sm text-muted">
            El stock se deriva de lo que registres.{" "}
            <a
              href="#registrar"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Cargá el primero
            </a>{" "}
            para empezar la trazabilidad.
          </p>
        </div>
      </div>
    );
  }

  const dias = agruparPorFecha(movimientos);

  return (
    <div className="flex flex-col gap-6">
      {dias.map((dia, i) => (
        <section
          key={dia.dia}
          aria-labelledby={`dia-${dia.dia}`}
          className={`overflow-hidden rounded-xl border border-border bg-surface shadow-card ${
            i === 0 ? "reveal" : `reveal reveal-delay-${Math.min(i, 3)}`
          }`}
        >
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border bg-bg px-4 py-3">
            <h3
              id={`dia-${dia.dia}`}
              className="flex items-center gap-2 text-sm font-semibold text-ink"
            >
              <CalendarBlank size={16} className="text-accent" aria-hidden />
              {dia.etiqueta}
            </h3>
            <p className="text-xs text-muted">
              <span className="num font-medium text-ink">{dia.remitos}</span>{" "}
              {dia.remitos === 1 ? "remito" : "remitos"} ·{" "}
              <span className="num font-medium text-ink">{formatKg(dia.totalKg)} kg</span>
              {dia.totalBolsas > 0 ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="num font-medium text-ink">
                    {formatEntero(dia.totalBolsas)}
                  </span>{" "}
                  bolsas
                </>
              ) : null}
            </p>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <caption className="sr-only">
                Movimientos registrados el {dia.etiqueta}
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Hora
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Remito
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Movimiento
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Origen → destino
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Mercadería
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Kilos
                  </th>
                </tr>
              </thead>
              <tbody>
                {dia.movimientos.map((mov) => (
                  <FilaMovimiento key={mov.id} mov={mov} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-accent/30 bg-bg">
                  <td colSpan={5} className="px-4 py-2 text-xs font-medium text-muted">
                    Total del día
                  </td>
                  <td className="num px-4 py-2 text-right font-semibold text-ink">
                    {formatKg(dia.totalKg)} kg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function FilaMovimiento({ mov }: { mov: MovimientoDTO }) {
  const kg = kgDeMovimiento(mov);
  const bolsas = bolsasDeMovimiento(mov);

  return (
    <tr className="border-b border-border align-top last:border-0 hover:bg-bg">
      <td className="num whitespace-nowrap px-4 py-3 text-muted">{hora(mov.fecha)}</td>
      <td className="num whitespace-nowrap px-4 py-3 text-ink">
        {mov.remito ?? <span className="text-muted">sin remito</span>}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <span className="inline-flex rounded-full border border-border bg-bg px-2 py-0.5 text-xs text-ink">
          {movementTypeLabel(mov.tipo)}
        </span>
      </td>
      <td className="px-4 py-3 text-ink">
        <span className="whitespace-nowrap">{mov.origen}</span>
        <span className="px-1 text-muted" aria-label="hacia">
          →
        </span>
        <span className="whitespace-nowrap">{mov.destino}</span>
        {mov.transporte ? (
          <span className="block text-xs text-muted">{mov.transporte}</span>
        ) : null}
      </td>
      <td className="px-4 py-3">
        {mov.items.length === 0 ? (
          <span className="text-muted">Sin ítems</span>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {mov.items.map((item, i) => (
              <li key={`${item.variedad}-${item.lote}-${i}`} className="text-ink">
                <span className="capitalize">{item.variedad}</span>
                <span className="text-muted"> · lote </span>
                <span className="num">{item.lote}</span>
                {item.categoria ? (
                  <span className="text-muted">
                    {" "}
                    · {CATEGORIA_LABEL[item.categoria] ?? item.categoria}
                  </span>
                ) : null}
                {mov.items.length > 1 ? (
                  <span className="num text-muted"> · {formatKg(item.kg)} kg</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="num whitespace-nowrap px-4 py-3 text-right font-medium text-ink">
        {formatKg(kg)} kg
        {bolsas > 0 ? (
          <span className="block text-xs font-normal text-muted">
            {formatEntero(bolsas)} bolsas
          </span>
        ) : null}
      </td>
    </tr>
  );
}
