import { MuestreoForm } from "@/app/components/MuestreoForm";
import { MuestreosPanel } from "@/app/components/MuestreosPanel";
import { EmptyState, PageHeader, Section, type Stat } from "@/app/components/Page";
import { getParcelasSelect } from "@/lib/actions/altas";
import { getMuestreos } from "@/lib/actions/muestreos";

export default async function MuestreosPage() {
  const [parcelas, parcelasSelect] = await Promise.all([
    getMuestreos(),
    getParcelasSelect(),
  ]);

  const totalMuestreos = parcelas.reduce((s, p) => s + p.muestreos.length, 0);
  const conEnsayo = parcelas.filter((p) => p.muestreos.length > 1).length;

  const stats: Stat[] = [
    { label: "Parcelas muestreadas", value: String(parcelas.length) },
    { label: "Muestreos", value: String(totalMuestreos) },
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
        description="Estimar antes de cosechar cuánto de cada parcela va a salir de exportación, que es el 25-30% del negocio, a partir de una muestra de tubérculos extraída en el campo."
        stats={stats}
      />

      <Section
        id="por-parcela"
        title="Proyección por parcela"
        description="Distribución de calibre de cada muestra, el reparto comercial que proyecta, y el contraste contra lo que la parcela produjo de verdad. Cuando hay dos tratamientos, se comparan lado a lado."
      >
        {parcelas.length > 0 ? (
          <MuestreosPanel parcelas={parcelas} />
        ) : (
          <EmptyState
            title="No hay muestreos cargados"
            description="Cargá un muestreo pre-cosecha para proyectar el reparto por calibre de una parcela."
          />
        )}
      </Section>

      <Section
        id="cargar-muestreo"
        title="Cargar muestreo"
        description="Se carga la muestra tal como se pesó en el campo: una línea por rango de calibre, con su peso y su cantidad de tubérculos. La proyección se recalcula sola."
      >
        <MuestreoForm parcelas={parcelasSelect} />
      </Section>

      <Section
        id="metodo"
        title="Cómo se calcula"
        description="Sin modelos ni predicción estadística: es una regla de tres sobre la muestra."
      >
        <div className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-ink">Se pesa la muestra</p>
            <p className="mt-1 text-sm text-muted">
              Entre 150 y 220 tubérculos por muestreo, separados por calibre en
              milímetros y pesados uno por uno.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Se clasifica el calibre</p>
            <p className="mt-1 text-sm text-muted">
              Por encima de 45 mm va a exportación, entre 30 y 45 a sin chicas, por
              debajo de 30 a descarte o semilla.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Se proyecta el reparto</p>
            <p className="mt-1 text-sm text-muted">
              El porcentaje en peso de cada grupo es la proyección de qué va a salir
              de esa parcela al cosecharla.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted">
          Es una extrapolación de una muestra chica, no un pronóstico exacto: sirve
          para orientar la decisión de cosecha, no para reemplazar el conteo real.
        </p>
      </Section>
    </>
  );
}
