import {
  CATEGORIA_LABEL,
  formatPctFraccion,
  formatUsd,
  type CostoPorCategoria,
} from "@/lib/ordenes";

// Dónde se concentra el gasto del plan sanitario. Salió tal cual de /ordenes:
// es un indicador, no una vista de carga, así que vive en /indicadores.

type Props = {
  filas: CostoPorCategoria[];
};

export function CostoPorCategoriaTable({ filas }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[24rem] text-sm">
        <caption className="sr-only">
          Costo de insumos por tipo de producto
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th scope="col" className="px-3 py-2 font-medium">
              Categoría
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Aplicaciones
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Costo U$S
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Del total
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((c) => (
            <tr key={c.categoria} className="border-b border-border last:border-0">
              <td className="px-3 py-2.5 font-medium text-ink">
                {CATEGORIA_LABEL[c.categoria]}
              </td>
              <td className="num px-3 py-2.5 text-right text-ink">
                {c.aplicaciones}
              </td>
              <td className="num px-3 py-2.5 text-right text-ink">
                {formatUsd(c.costo)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="num text-ink">
                    {formatPctFraccion(c.fraccion)}
                  </span>
                  <span
                    className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-border"
                    aria-hidden
                  >
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.round(c.fraccion * 100)}%` }}
                    />
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
