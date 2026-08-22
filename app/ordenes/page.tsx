import { WorkOrdersTable } from "@/app/components/WorkOrdersTable";
import { PageHeader, Section, TableCard, type Stat } from "@/app/components/Page";
import {
  INSUMOS,
  ORDENES,
  PARCELAS,
  costoLinea,
  costoOrden,
  costoPorHectarea,
  formatHa,
  formatUsd,
  getInsumo,
  getParcela,
  ordenesDeParcela,
} from "@/lib/mocks/campo";

export default function OrdenesPage() {
  const ordenes = ORDENES;
  const totalUsd = ordenes.reduce((sum, orden) => sum + costoOrden(orden), 0);

  const codigosConOrden = new Set(ordenes.map((o) => o.parcelaCodigo));
  const hectareasCubiertas = [...codigosConOrden].reduce(
    (sum, codigo) => sum + (getParcela(codigo)?.superficieHa ?? 0),
    0,
  );
  const aplicaciones = ordenes.reduce((sum, o) => sum + o.lineas.length, 0);

  // Costo por parcela: es el dato que cruza con la producción de esa misma parcela.
  const porParcela = PARCELAS.filter((p) => codigosConOrden.has(p.codigo))
    .map((p) => {
      const suyas = ordenesDeParcela(p.codigo, ordenes);
      return {
        parcela: p,
        ordenes: suyas.length,
        costo: suyas.reduce((sum, o) => sum + costoOrden(o), 0),
        costoHa: costoPorHectarea(p, ordenes),
      };
    })
    .sort((a, b) => b.costoHa - a.costoHa);

  // Costo por categoría de insumo: dónde se va la plata del plan sanitario.
  const porCategoria = new Map<string, { costo: number; aplicaciones: number }>();
  for (const orden of ordenes) {
    const parcela = getParcela(orden.parcelaCodigo);
    if (!parcela) continue;
    for (const linea of orden.lineas) {
      const insumo = getInsumo(linea.insumoId);
      if (!insumo) continue;
      const prev = porCategoria.get(insumo.categoria) ?? {
        costo: 0,
        aplicaciones: 0,
      };
      prev.costo += costoLinea(linea, insumo, parcela);
      prev.aplicaciones += 1;
      porCategoria.set(insumo.categoria, prev);
    }
  }
  const categorias = [...porCategoria.entries()].sort(
    (a, b) => b[1].costo - a[1].costo,
  );

  const stats: Stat[] = [
    { label: "Órdenes", value: String(ordenes.length) },
    { label: "Aplicaciones", value: String(aplicaciones) },
    { label: "Costo total", value: formatUsd(totalUsd), unit: "U$S" },
    {
      label: "Hectáreas cubiertas",
      value: formatHa(hectareasCubiertas),
      unit: "ha",
      hint: `${codigosConOrden.size} parcelas`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Órdenes de trabajo"
        description="Qué se aplicó, en qué parcela, cuándo y con qué insumos. Cada línea lleva su dosis por hectárea y su costo, calculado contra el catálogo de precios. Datos de ejemplo."
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
                {porParcela.map((r) => (
                  <tr key={r.parcela.codigo} className="border-b border-border last:border-0">
                    <td className="num px-3 py-2 font-medium text-ink">
                      {r.parcela.codigo}
                    </td>
                    <td className="px-3 py-2 text-muted">{r.parcela.variedad}</td>
                    <td className="num px-3 py-2 text-right text-ink">
                      {formatHa(r.parcela.superficieHa)}
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
                {categorias.map(([cat, v]) => {
                  const pct = totalUsd > 0 ? v.costo / totalUsd : 0;
                  return (
                    <tr key={cat} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium text-ink">{cat}</td>
                      <td className="num px-3 py-2 text-right text-ink">
                        {v.aplicaciones}
                      </td>
                      <td className="num px-3 py-2 text-right text-ink">
                        {formatUsd(v.costo)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="num text-ink">
                            {new Intl.NumberFormat("es-AR", {
                              style: "percent",
                              maximumFractionDigits: 0,
                            }).format(pct)}
                          </span>
                          <span
                            className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-border"
                            aria-hidden
                          >
                            <span
                              className="block h-full rounded-full bg-accent"
                              style={{ width: `${Math.round(pct * 100)}%` }}
                            />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
          <p className="text-xs text-muted">
            Catálogo de {INSUMOS.length} insumos con precio y dosis recomendada.
          </p>
        </Section>
      </div>

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
