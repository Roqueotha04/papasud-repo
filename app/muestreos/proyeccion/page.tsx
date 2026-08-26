import { Flask } from "@phosphor-icons/react/ssr";
import { EmptyState, PageHeader, Section, type Stat } from "@/app/components/Page";
import { ExportLink } from "@/app/components/ExportLink";
import {
  ProyeccionPanel,
  filasProyeccion,
  formatPuntos,
} from "@/app/components/ProyeccionPanel";
import { getMuestreos } from "@/lib/actions/muestreos";
import { formatNumeroProy } from "@/lib/proyeccion";

export default async function ProyeccionPage() {
  const parcelas = await getMuestreos();
  const filas = filasProyeccion(parcelas);

  // Con contraste primero y ordenadas por desvío absoluto: arriba queda donde
  // el muestreo más se despegó de lo que terminó entrando, que es lo accionable.
  const conReal = filas
    .filter((f) => f.desvioPts !== null)
    .sort((a, b) => Math.abs(b.desvioPts ?? 0) - Math.abs(a.desvioPts ?? 0));
  const sinReal = filas.filter((f) => f.desvioPts === null);

  const superficieTotal = filas.reduce((s, f) => s + f.superficieHa, 0);
  const proyectadoPonderado =
    superficieTotal > 0
      ? filas.reduce((s, f) => s + f.proyectadoPct * f.superficieHa, 0) / superficieTotal
      : null;

  const kgIngreso = conReal.reduce((s, f) => s + f.totalKgIngreso, 0);
  const kgExportacion = conReal.reduce((s, f) => s + f.kgExportacion, 0);
  const realPonderado = kgIngreso > 0 ? (kgExportacion / kgIngreso) * 100 : null;

  const mayorDesvio = conReal[0] ?? null;

  const stats: Stat[] = [
    {
      label: "Parcelas proyectadas",
      value: String(filas.length),
      hint: `${conReal.length} con producción real para contrastar`,
    },
  ];
  // Cada número solo aparece si hay con qué calcularlo: sin muestreos no hay
  // proyección y sin ingresos no hay real. No se muestra un 0 que no lo es.
  if (proyectadoPonderado !== null) {
    stats.push({
      label: "Exportación proyectada",
      value: formatNumeroProy(proyectadoPonderado),
      unit: "%",
      hint: "Promedio ponderado por hectárea",
    });
  }
  if (realPonderado !== null) {
    stats.push({
      label: "Exportación real",
      value: formatNumeroProy(realPonderado),
      unit: "%",
      hint: "kg de exportación sobre kg ingresados",
    });
  }
  if (mayorDesvio?.desvioPts != null) {
    stats.push({
      label: "Mayor desvío",
      value: formatPuntos(mayorDesvio.desvioPts),
      unit: "pts",
      hint: `Parcela ${mayorDesvio.codigo}`,
    });
  }

  return (
    <>
      <PageHeader
        title="Proyección de cosecha"
        description="Cuánto de cada parcela va a salir de exportación según su muestreo pre-cosecha, y cuánto salió de verdad. La exportación es el 25-30% del negocio: es la pregunta que se contesta antes de entrar a cosechar."
        stats={stats}
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportLink tipo="muestreos" />
            <a
              href="/muestreos"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-accent/10"
            >
              <Flask size={16} aria-hidden />
              Cargar muestreo
            </a>
          </div>
        }
      />

      {filas.length === 0 ? (
        <EmptyState
          title="No hay muestreos cargados"
          description="Sin muestreo pre-cosecha no hay proyección que contrastar. Cargá uno desde la página de muestreos."
        />
      ) : null}

      {conReal.length > 0 ? (
        <Section
          id="contraste"
          title="Proyectado contra lo que entró"
          description="Ordenadas por diferencia: arriba quedan las parcelas donde el muestreo más se despegó de la producción real. Un desvío de 10 puntos o más se marca."
        >
          <ProyeccionPanel filas={conReal} />
        </Section>
      ) : null}

      {sinReal.length > 0 ? (
        <Section
          id="sin-contraste"
          title="Todavía sin cosecha registrada"
          description="Parcelas con muestreo cargado pero sin movimientos de ingreso. Se muestra la proyección sola: no hay dato real, y no se completa con un cero."
        >
          <ProyeccionPanel filas={sinReal} />
        </Section>
      ) : null}

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
          para orientar la decisión de cosecha, no para reemplazar el conteo real. El
          lado real no sale de los movimientos de ingreso, que entran sin categoría
          comercial: se reconstruye siguiendo la partida (variedad y lote) hasta los
          movimientos posteriores al tamañado, que son los que clasifican.
        </p>
      </Section>
    </>
  );
}
