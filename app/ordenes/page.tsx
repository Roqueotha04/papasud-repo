import { OrdenTrabajoForm } from "@/app/components/OrdenTrabajoForm";
import { PageHeader, Section, TableCard, type Stat } from "@/app/components/Page";
import { WorkOrdersTable } from "@/app/components/WorkOrdersTable";
import { getInsumosSelect, getParcelasSelect } from "@/lib/actions/altas";
import {
  CATEGORIA_LABEL,
  formatHa,
  formatPctFraccion,
  formatUsd,
  getOrdenes,
  getResumenOrdenes,
} from "@/lib/ordenes";

export default async function OrdenesPage() {
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

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Section
          id="por-parcela"
          title="Costo por parcela"
          description="Ordenado por costo por hectárea: es lo que se compara contra la producción de esa misma parcela."
        >
          <TableCard>
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="px-3 py-2 font-medium text-ink">
                    Parcela
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-ink">
                    Variedad
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-ink">
                    Ha
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-ink">
                    Órdenes
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-ink">
                    Costo U$S
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-ink">
                    U$S/ha
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumen.porParcela.map((r) => (
                  <tr key={r.codigo} className="border-b border-border last:border-0">
                    <td className="num px-3 py-2 font-medium text-ink">
                      {r.codigo}
                    </td>
                    <td className="px-3 py-2 capitalize text-muted">{r.variedad}</td>
                    <td className="num px-3 py-2 text-right text-ink">
                      {formatHa(r.superficieHa)}
                    </td>
                    <td className="num px-3 py-2 text-right text-ink">{r.ordenes}</td>
                    <td className="num px-3 py-2 text-right text-ink">
                      {formatUsd(r.costo)}
                    </td>
                    <td className="num px-3 py-2 text-right font-medium text-ink">
                      {formatUsd(r.costoHa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </Section>

        <Section
          id="por-categoria"
          title="Costo por tipo de insumo"
          description="Dónde se concentra el gasto del plan sanitario."
        >
          <TableCard>
            <table className="w-full min-w-[24rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="px-3 py-2 font-medium text-ink">
                    Categoría
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-ink">
                    Aplicaciones
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-ink">
                    Costo U$S
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-ink">
                    Del total
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumen.porCategoria.map((c) => (
                  <tr key={c.categoria} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-ink">
                      {CATEGORIA_LABEL[c.categoria]}
                    </td>
                    <td className="num px-3 py-2 text-right text-ink">
                      {c.aplicaciones}
                    </td>
                    <td className="num px-3 py-2 text-right text-ink">
                      {formatUsd(c.costo)}
                    </td>
                    <td className="px-3 py-2 text-right">
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
          </TableCard>
        </Section>
      </div>

      <Section
        id="cargar-orden"
        title="Cargar orden de trabajo"
        description="El costo se calcula mientras se carga: dosis por hectárea, por la superficie de la parcela, por el precio del insumo. Se ve lo que sale la aplicación antes de emitirla."
      >
        <OrdenTrabajoForm parcelas={parcelas} insumos={insumos} />
      </Section>

      <Section
        id="detalle"
        title="Detalle por orden"
        description="Cada orden con sus líneas de insumo, dosis, uso total y herramienta. La fecha de emisión y la de tarea son distintas: la aplicación se hace de madrugada o de noche, cuando no hay viento."
      >
        <WorkOrdersTable ordenes={ordenes} />
      </Section>
    </>
  );
}
