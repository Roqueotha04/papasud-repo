import { EmptyState, PageHeader, Section, type Stat } from "@/app/components/Page";
import { ParcelasTable } from "@/app/components/ParcelasTable";
import { getParcelas } from "@/lib/actions/parcelas";

function formatKg(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function formatHa(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
}


export default async function ParcelasPage() {
  const parcelas = await getParcelas();

  const conProduccion = parcelas.filter((p) => p.kgTotal > 0);
  const sinProduccion = parcelas.filter((p) => p.kgTotal === 0);

  const superficieTotal = parcelas.reduce((s, p) => s + p.superficieHa, 0);
  const kgTotal = parcelas.reduce((s, p) => s + p.kgTotal, 0);
  const conMuestreo = parcelas.filter((p) => p.tieneMuestreos).length;

  const stats: Stat[] = [
    {
      label: "Parcelas",
      value: String(parcelas.length),
      hint: `${conProduccion.length} con cosecha registrada`,
    },
    { label: "Superficie", value: formatHa(superficieTotal), unit: "ha" },
    { label: "Producción", value: formatKg(kgTotal), unit: "kg" },
    {
      label: "Rendimiento general",
      value: formatKg(superficieTotal > 0 ? kgTotal / superficieTotal : 0),
      unit: "kg/ha",
    },
  ];

  return (
    <>
      <PageHeader
        title="Parcelas"
        description="La unidad de campo del negocio. Cada parcela conecta las órdenes de trabajo que recibió, el muestreo pre-cosecha y la producción que efectivamente entró al depósito. Entrá a una para ver la cadena completa."
        stats={stats}
      />

      <Section
        id="con-produccion"
        title="Con cosecha registrada"
        description={`${conProduccion.length} parcelas cuya producción ya ingresó al circuito. ${conMuestreo} tienen muestreo pre-cosecha cargado.`}
      >
        {conProduccion.length > 0 ? (
          <ParcelasTable filas={conProduccion} />
        ) : (
          <EmptyState title="Todavía no hay ingresos desde el campo registrados" />
        )}
      </Section>

      {sinProduccion.length > 0 ? (
        <Section
          id="sin-produccion"
          title="Sin actividad registrada"
          description="Parcelas sembradas de las que todavía no ingresó mercadería. No es un error: o no se cosecharon, o el ingreso no se asentó."
        >
          <ParcelasTable filas={sinProduccion} />
        </Section>
      ) : null}
    </>
  );
}
