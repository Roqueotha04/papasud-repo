"use client";

import { CircleNotch, MagnifyingGlass, PaperPlaneRight, Sparkle, Warning } from "@phosphor-icons/react";
import { useState, useTransition, type FormEvent } from "react";
import { preguntarAlAsistente, type PasoHerramienta } from "@/lib/agent/ask";
import { etiquetaHerramienta } from "@/lib/agent/labels";

// Las sugerencias no son decorativas: muestran de un vistazo que el asistente
// llega a todo el sistema y no solo al saldo del depósito. Una por área.
const SUGERENCIAS = [
  "¿Dónde está el lote 235 y de qué parcela salió?",
  "¿Qué variedad tiene más kilos en stock?",
  "¿Qué parcela rindió mejor esta campaña?",
  "¿Hay faltantes en el conteo?",
  "¿Cuánto gastamos en fungicidas y en qué parcelas?",
  "¿A qué parcela le erró más el muestreo?",
];

type Estado =
  | { tipo: "vacio" }
  | { tipo: "ok"; pregunta: string; texto: string; pasos: PasoHerramienta[] }
  | { tipo: "error"; mensaje: string };

export function AskPanel() {
  const [valor, setValor] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "vacio" });
  const [pending, startTransition] = useTransition();

  function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || pending) return;

    startTransition(async () => {
      const res = await preguntarAlAsistente(limpia);
      if (res.ok) {
        setEstado({
          tipo: "ok",
          pregunta: limpia,
          texto: res.texto,
          pasos: res.pasos,
        });
        setValor("");
      } else {
        setEstado({ tipo: "error", mensaje: res.error });
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    enviar(valor);
  }

  return (
    <section className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          disabled={pending}
          placeholder="Preguntá sobre stock, lotes, parcelas, órdenes o rendimientos"
          aria-label="Pregunta sobre la operación"
          className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-ink outline-none transition-colors placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || valor.trim().length === 0}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? (
            <CircleNotch size={18} weight="bold" className="animate-spin" aria-hidden />
          ) : (
            <PaperPlaneRight size={18} weight="fill" aria-hidden />
          )}
          {pending ? "Consultando" : "Preguntar"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGERENCIAS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => {
              setValor(s);
              enviar(s);
            }}
            className="rounded-full border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-ink disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {pending ? (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden />
          Consultando la base. Puede tardar unos segundos si necesita cruzar varias
          vistas.
        </p>
      ) : null}

      {estado.tipo === "error" ? (
        <p className="flex items-start gap-2 rounded-lg border border-danger bg-danger-bg px-4 py-3 text-sm text-danger">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          {estado.mensaje}
        </p>
      ) : null}

      {estado.tipo === "ok" ? (
        <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">{estado.pregunta}</p>
          <div className="flex gap-3">
            <Sparkle size={20} weight="fill" className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <p className="whitespace-pre-wrap text-ink">{estado.texto}</p>
          </div>
          <Consultas pasos={estado.pasos} />
        </article>
      ) : null}
    </section>
  );
}

/** Qué miró el asistente antes de contestar. Es lo que hace auditable la
 *  respuesta: si consultó lo que no correspondía, se ve. */
function Consultas({ pasos }: { pasos: PasoHerramienta[] }) {
  if (pasos.length === 0) {
    return (
      <p className="border-t border-border pt-3 text-xs text-muted">
        El asistente respondió sin consultar la base: revisá el dato antes de usarlo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <MagnifyingGlass size={13} aria-hidden />
        {pasos.length === 1
          ? "Consultó una vista del sistema"
          : `Cruzó ${pasos.length} consultas`}{" "}
        para responder:
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {pasos.map((paso, i) => (
          <li
            key={`${paso.nombre}-${i}`}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              paso.error
                ? "border-danger/40 bg-danger-bg text-danger"
                : "border-border bg-bg text-muted"
            }`}
            title={resumirArgumentos(paso.argumentos)}
          >
            {etiquetaHerramienta(paso.nombre)}
            {resumirArgumentos(paso.argumentos) ? (
              <span className="text-ink"> · {resumirArgumentos(paso.argumentos)}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function resumirArgumentos(args: Record<string, unknown>): string {
  return Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}
