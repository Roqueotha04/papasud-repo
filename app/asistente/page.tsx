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
              Preguntas en lenguaje natural sobre toda la operación. Consulta el
              sistema y responde con los mismos números que muestran las pantallas.
            </p>
          </div>
        </div>
      </header>

      <AskPanel />

      <section
        aria-labelledby="alcance-heading"
        className="rounded-xl border border-border bg-surface p-5"
      >
        <h2 id="alcance-heading" className="text-base font-semibold text-ink">
          Qué puede consultar
        </h2>
        <p className="mt-1 text-sm text-muted">
          El asistente no recibe un resumen preparado: elige qué vistas leer según
          lo que le preguntes, y puede cruzar varias en una sola respuesta. Debajo
          de cada respuesta queda anotado qué consultó.
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {ALCANCE.map((item) => (
            <li key={item.titulo}>
              <p className="text-sm font-medium text-ink">{item.titulo}</p>
              <p className="text-sm text-muted">{item.detalle}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
          Solo lee. Registrar movimientos, conteos, parcelas u órdenes sigue siendo
          cosa del formulario de cada sección, que es donde vive la validación.
        </p>
      </section>
    </>
  );
}

const ALCANCE = [
  {
    titulo: "Stock",
    detalle: "Qué hay en cada depósito, por variedad y por lote.",
  },
  {
    titulo: "Trazabilidad",
    detalle: "De qué parcela salió un lote, por dónde pasó y dónde está el saldo.",
  },
  {
    titulo: "Movimientos",
    detalle: "Remitos por fecha, tipo, cliente, transporte o ubicación.",
  },
  {
    titulo: "Parcelas e indicadores",
    detalle: "Superficie, producción, rendimiento y porcentaje de exportación.",
  },
  {
    titulo: "Muestreos y proyección",
    detalle: "Qué proyectaba cada parcela y cuánto le erró contra la cosecha.",
  },
  {
    titulo: "Órdenes y costos",
    detalle: "Qué se aplicó, con qué dosis y cuánto costó por hectárea.",
  },
  {
    titulo: "Discrepancias",
    detalle: "Diferencias entre el stock derivado y el conteo físico.",
  },
  {
    titulo: "Catálogos",
    detalle: "Ubicaciones, campañas, variedades, clientes e insumos con precio.",
  },
];
