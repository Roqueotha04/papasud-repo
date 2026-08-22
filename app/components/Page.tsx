import type { ReactNode } from "react";

// Primitivas de estructura de página. Todas las rutas las usan, así que la
// jerarquía visual (h1 de página, h2 de sección) es la misma en todos lados
// y el usuario siempre sabe en qué nivel está parado.

export type Stat = {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
};

/** Encabezado de página: título, bajada y la fila de números que resumen la vista. */
export function PageHeader({
  title,
  description,
  stats,
  actions,
}: {
  title: string;
  description?: string;
  stats?: Stat[];
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-border pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {stats && stats.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className="num mt-0.5 text-2xl font-medium tracking-tight text-ink">
                {s.value}
                {s.unit ? (
                  <span className="ml-1 text-base font-normal text-muted">
                    {s.unit}
                  </span>
                ) : null}
              </dd>
              {s.hint ? (
                <p className="mt-0.5 text-xs text-muted">{s.hint}</p>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}

/** Bloque temático dentro de una página. Es lo que da la subdivisión. */
export function Section({
  title,
  description,
  actions,
  children,
  id,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  const headingId = `${id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;

  return (
    <section aria-labelledby={headingId} id={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Contenedor de tabla: borde, fondo y scroll horizontal propio. */
export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      {children}
    </div>
  );
}

/** Estado vacío sobrio, para secciones sin datos. */
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
}
