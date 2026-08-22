import { ClipboardText } from "@phosphor-icons/react/ssr";
import { WorkOrdersTable } from "@/app/components/WorkOrdersTable";
import { ORDENES, costoOrden, formatHa, formatUsd, getParcela } from "@/lib/mocks/campo";

export default function OrdenesPage() {
  const ordenes = ORDENES;

  const totalUsd = ordenes.reduce((sum, orden) => sum + costoOrden(orden), 0);

  const parcelasCubiertas = new Set(ordenes.map((o) => o.parcelaCodigo));
  const hectareasCubiertas = Array.from(parcelasCubiertas).reduce(
    (sum, codigo) => sum + (getParcela(codigo)?.superficieHa ?? 0),
    0,
  );

  return (
    <main className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <ClipboardText
            size={26}
            weight="fill"
            className="shrink-0 text-accent"
            aria-hidden
          />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
              Órdenes de trabajo
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Aplicaciones de insumos por parcela, con dosis y costo. Datos de
              ejemplo de Raíz Tech.
            </p>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="text-sm text-muted">Órdenes</dt>
            <dd className="num mt-0.5 text-2xl font-medium tracking-tight text-ink">
              {ordenes.length}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Total en U$S</dt>
            <dd className="num mt-0.5 text-2xl font-medium tracking-tight text-ink">
              {formatUsd(totalUsd)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Hectáreas cubiertas</dt>
            <dd className="num mt-0.5 text-2xl font-medium tracking-tight text-ink">
              {formatHa(hectareasCubiertas)}{" "}
              <span className="text-base font-normal text-muted">ha</span>
            </dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="ordenes-heading" className="flex flex-col gap-3">
        <h2 id="ordenes-heading" className="text-lg font-semibold text-ink">
          Detalle por orden
        </h2>
        <WorkOrdersTable ordenes={ordenes} />
      </section>
    </main>
  );
}
