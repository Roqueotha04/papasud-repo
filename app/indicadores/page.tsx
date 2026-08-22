import { ChartBar } from "@phosphor-icons/react/ssr";
import { IndicadoresTable } from "@/app/components/IndicadoresTable";
import { PARCELAS } from "@/lib/mocks/campo";

export default function IndicadoresPage() {
  return (
    <main className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <ChartBar
            size={26}
            weight="fill"
            className="shrink-0 text-accent"
            aria-hidden
          />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
              Indicadores
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Producción, rendimiento y costo de insumos por parcela. Datos de
              ejemplo de Raíz Tech.
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="indicadores-heading" className="flex flex-col gap-3">
        <h2 id="indicadores-heading" className="text-lg font-semibold text-ink">
          Por parcela
        </h2>
        <IndicadoresTable parcelas={PARCELAS} />
      </section>
    </main>
  );
}
