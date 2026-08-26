"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Field, fieldClass } from "@/app/components/FormBits";

// Filtros de la página de indicadores.
//
// Antes esto era una fila de pills con el mismo lenguaje visual que el sidebar,
// metida en el slot `actions` del PageHeader: parecía una segunda barra de
// navegación y desalineaba el título. Ahora es lo que es, un control de
// formulario, y vive en su propio bloque debajo del encabezado.
//
// El filtrado sigue siendo del servidor: el estado viaja en la query string, así
// que la vista filtrada se puede compartir por link. Sin JS el <form method=get>
// hace exactamente lo mismo con el botón "Aplicar".

type CampaniaOpcion = { id: string; nombre: string };

type Seleccion = { campania: string; variedad: string };

type Props = {
  campanias: CampaniaOpcion[];
  variedades: string[];
  /** Nombre de campaña, no id: es como filtra calcularIndicadores(). */
  campania?: string;
  variedad?: string;
};

export function IndicadoresFiltros({
  campanias,
  variedades,
  campania,
  variedad,
}: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [seleccion, setSeleccion] = useOptimistic<Seleccion>({
    campania: campania ?? "",
    variedad: variedad ?? "",
  });

  function aplicar(next: Seleccion) {
    const query = new URLSearchParams();
    if (next.campania) query.set("campania", next.campania);
    if (next.variedad) query.set("variedad", next.variedad);
    const qs = query.toString();

    startTransition(() => {
      // useOptimistic solo acepta cambios dentro de una transición. Sin esto el
      // select vuelve al valor viejo hasta que el servidor responde.
      setSeleccion(next);
      router.push(qs ? `/indicadores?${qs}` : "/indicadores", { scroll: false });
    });
  }

  const hayFiltro = Boolean(seleccion.campania || seleccion.variedad);

  return (
    <form
      method="get"
      action="/indicadores"
      aria-labelledby="filtros-heading"
      aria-busy={pendiente}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="filtros-heading" className="text-sm font-medium text-ink">
          Filtrar
        </h2>
        {hayFiltro ? (
          <a
            href="/indicadores"
            className="text-sm font-medium text-accent-strong underline-offset-2 transition-colors hover:underline"
          >
            Limpiar filtros
          </a>
        ) : (
          <p className="text-xs text-muted">
            Sin filtros: se ve todo lo cargado.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <Field label="Campaña" htmlFor="filtro-campania">
          <select
            id="filtro-campania"
            name="campania"
            className={fieldClass}
            value={seleccion.campania}
            onChange={(e) =>
              aplicar({ ...seleccion, campania: e.target.value })
            }
          >
            <option value="">Todas las campañas</option>
            {campanias.map((c) => (
              <option key={c.id} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Variedad" htmlFor="filtro-variedad">
          <select
            id="filtro-variedad"
            name="variedad"
            className={`${fieldClass} capitalize`}
            value={seleccion.variedad}
            onChange={(e) =>
              aplicar({ ...seleccion, variedad: e.target.value })
            }
          >
            <option value="">Todas las variedades</option>
            {variedades.map((v) => (
              <option key={v} value={v} className="capitalize">
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p className="text-xs text-muted">
        El filtro alcanza a toda la página: producción, rendimiento y costo de
        insumos salen del mismo conjunto de parcelas.
      </p>

      <noscript>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-accent-strong px-4 text-sm font-medium text-white"
        >
          Aplicar
        </button>
      </noscript>
    </form>
  );
}
