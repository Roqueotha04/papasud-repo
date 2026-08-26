import Link from "next/link";
import { ChartLineUp } from "@phosphor-icons/react/ssr";
import { MuestreoForm } from "@/app/components/MuestreoForm";
import { MuestreosPanel } from "@/app/components/MuestreosPanel";
import { QuerySelect } from "@/app/components/QuerySelect";
import { EmptyState, PageHeader, Section, type Stat } from "@/app/components/Page";
import { getParcelasSelect } from "@/lib/actions/altas";
import { getMuestreos } from "@/lib/actions/muestreos";
import { formatEntero } from "@/app/components/format";

type SearchParams = Promise<{ parcela?: string | string[] }>;

function primerValor(valor: string | string[] | undefined): string | undefined {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  return crudo?.trim() || undefined;
}

export default async function MuestreosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const parcelaId = primerValor(params.parcela);

  const [parcelas, parcelasSelect] = await Promise.all([
    getMuestreos(),
    getParcelasSelect(),
  ]);

  const ordenadas = [...parcelas].sort((a, b) =>
    a.codigo.localeCompare(b.codigo, "es", { numeric: true }),
  );
  const seleccionada =
    ordenadas.length === 1
      ? ordenadas[0]
      : ordenadas.find((p) => p.parcelaId === parcelaId);

  const totalMuestreos = parcelas.reduce((s, p) => s + p.muestreos.length, 0);
  const conEnsayo = parcelas.filter((p) => p.muestreos.length > 1).length;
  const tuberculos = parcelas.reduce(
    (s, p) => s + p.muestreos.reduce((t, m) => t + m.nTuberculos, 0),
    0,
  );

  const stats: Stat[] = [
    { label: "Muestreos cargados", value: String(totalMuestreos) },
    { label: "Parcelas muestreadas", value: String(parcelas.length) },
    {
      label: "Tubérculos pesados",
      value: formatEntero(tuberculos),
      hint: "Entre todas las muestras",
    },
    {
      label: "Con ensayo comparado",
      value: String(conEnsayo),
      hint: "Rootex contra testigo",
    },
  ];

  return (
    <>
      <PageHeader
        title="Muestreos pre-cosecha"
        description="El registro de lo que se sacó del campo antes de cosechar: qué parcela, cuándo, con qué tratamiento y cómo se repartió el peso por calibre. La proyección que sale de estos números se lee en su propia página."
        stats={stats}
        actions={
          <Link
            href="/muestreos/proyeccion"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-accent/10"
          >
            <ChartLineUp size={16} aria-hidden />
            Ver proyección
          </Link>
        }
      />

      <Section
        id="cargar-muestreo"
        title="Cargar muestreo"
        description="Se carga la muestra tal como se pesó en el campo: una línea por rango de calibre, con su peso y su cantidad de tubérculos. La proyección se recalcula sola."
        emphasis
      >
        <MuestreoForm parcelas={parcelasSelect} />
      </Section>

      <Section
        id="registrados"
        title="Muestreos registrados"
        description="Cada muestra con su fecha, su tratamiento, la distribución por calibre y el reparto comercial que proyecta. Cuando hay dos tratamientos, se comparan lado a lado."
        actions={
          ordenadas.length > 1 ? (
            <QuerySelect
              action="/muestreos"
              name="parcela"
              label="Parcela"
              hideLabel
              value={seleccionada?.parcelaId ?? ""}
              emptyOption={{ value: "", label: "Elegí una parcela" }}
              options={ordenadas.map((p) => ({
                value: p.parcelaId,
                label: `${p.codigo} · ${p.variedad}`,
              }))}
            />
          ) : null
        }
      >
        {ordenadas.length === 0 ? (
          <EmptyState
            title="No hay muestreos cargados"
            description="Cargá un muestreo pre-cosecha para proyectar el reparto por calibre de una parcela."
          />
        ) : seleccionada ? (
          <MuestreosPanel parcelas={[seleccionada]} />
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-5 text-sm text-muted">
            Elegí una parcela para ver sus muestreos, calibres y proyección
            comercial.
          </p>
        )}
      </Section>
    </>
  );
}
