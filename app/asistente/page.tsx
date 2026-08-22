import { ChatCircleDots } from "@phosphor-icons/react/ssr";
import { AskPanel } from "@/app/components/AskPanel";

export default function AsistentePage() {
  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <ChatCircleDots
            size={26}
            weight="fill"
            className="shrink-0 text-accent"
            aria-hidden
          />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
              Asistente
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Preguntas en lenguaje natural sobre el stock real, derivado de los
              movimientos registrados.
            </p>
          </div>
        </div>
      </header>

      <AskPanel />
    </>
  );
}
