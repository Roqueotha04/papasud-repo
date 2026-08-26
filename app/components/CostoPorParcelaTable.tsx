import type { ParcelaIndicador } from "@/lib/indicadores";
import {
  formatHa,
  formatNumero,
  formatUsd,
  type CostoPorParcela,
} from "@/lib/ordenes";

// Costo de insumos y producción de la misma parcela, en la misma fila.
//
// Salió de la tabla "Costo por parcela" que vivía en /ordenes. Ahí mostraba
// solo el costo, que es medio dato: U$S/ha no dice nada hasta que se lo pone al
// lado de los kilos que salieron de esa hectárea. Las dos mitades cuelgan de la
// misma parcela, así que se cruzan por parcelaId (el código se repite entre
// campañas: es único por (codigo, campaniaId), no solo).

type Props = {
  /** Todas las parcelas del filtro, tengan o no órdenes cargadas. */
  produccion: ParcelaIndicador[];
  costos: CostoPorParcela[];
};

type Fila = {
  parcelaId: string;
  codigo: string;
  variedad: string;
  superficieHa: number;
  produccionKg: number;
  rendimientoKgHa: number;
  ordenes: number;
  costo: number;
  costoHa: number;
  /** Costo de insumos por tonelada producida. Null si falta alguna de las dos puntas. */
  costoTn: number | null;
};

function armarFilas({ produccion, costos }: Props): Fila[] {
  const costoPorParcela = new Map(costos.map((c) => [c.parcelaId, c]));

  return produccion
    .map((p): Fila => {
      const costo = costoPorParcela.get(p.parcelaId);
      const costoUsd = costo?.costo ?? 0;
      return {
        parcelaId: p.parcelaId,
        codigo: p.codigo,
        variedad: p.variedad,
        superficieHa: p.superficieHa,
        produccionKg: p.produccionKg,
        rendimientoKgHa: p.rendimientoKgHa,
        ordenes: costo?.ordenes ?? 0,
        costo: costoUsd,
        costoHa: costo?.costoHa ?? 0,
        costoTn:
          costoUsd > 0 && p.produccionKg > 0
            ? costoUsd / (p.produccionKg / 1000)
            : null,
      };
    })
    .sort((a, b) => b.costoHa - a.costoHa || a.codigo.localeCompare(b.codigo, "es"));
}

const SIN_DATO = <span className="text-muted">-</span>;

export function CostoPorParcelaTable(props: Props) {
  const filas = armarFilas(props);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[58rem] text-sm">
        <caption className="sr-only">
          Costo de insumos y producción por parcela
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th scope="col" className="px-3 py-2 font-medium">
              Parcela
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Variedad
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Ha
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Producción (kg)
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Rendimiento (kg/ha)
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Órdenes
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Costo insumos (U$S)
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              U$S/ha
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              U$S/tn
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => {
            const delay =
              i === 0 ? "reveal" : `reveal reveal-delay-${Math.min(i, 3)}`;
            return (
              <tr
                key={f.parcelaId}
                className={`border-b border-border last:border-0 hover:bg-bg ${delay}`}
              >
                <td className="px-3 py-2.5 font-medium text-ink">{f.codigo}</td>
                <td className="px-3 py-2.5 capitalize text-muted">
                  {f.variedad}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {formatHa(f.superficieHa)}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {f.produccionKg > 0 ? formatNumero(f.produccionKg) : SIN_DATO}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {f.produccionKg > 0
                    ? formatNumero(f.rendimientoKgHa)
                    : SIN_DATO}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {f.ordenes > 0 ? f.ordenes : SIN_DATO}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {f.costo > 0 ? formatUsd(f.costo) : SIN_DATO}
                </td>
                <td className="num px-3 py-2.5 text-right font-medium text-ink">
                  {f.costoHa > 0 ? formatUsd(f.costoHa) : SIN_DATO}
                </td>
                <td className="num px-3 py-2.5 text-right text-ink">
                  {f.costoTn == null ? SIN_DATO : formatNumero(f.costoTn, 1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
