"use client";

import { CircleNotch, PaperPlaneRight, Sparkle } from "@phosphor-icons/react";
import { useState, useTransition, type FormEvent } from "react";
import { preguntarAlAsistente } from "@/lib/agent/ask";

const SUGERENCIAS = [
  "¿Dónde está el lote 235?",
  "¿Cuánto stock hay en Sasula?",
  "¿Qué variedad tiene más kilos en total?",
];

type Estado =
  | { tipo: "vacio" }
  | { tipo: "ok"; pregunta: string; texto: string; filas: number }
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
          filas: res.filas,
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
          placeholder="Preguntá sobre el stock"
          aria-label="Pregunta sobre el stock"
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

      {estado.tipo === "error" ? (
        <p className="rounded-lg border border-danger bg-danger-bg px-4 py-3 text-sm text-danger">
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
          <p className="border-t border-border pt-3 text-xs text-muted">
            Respondido sobre {estado.filas} filas de stock derivadas de los
            movimientos registrados. El modelo no accede a la base: recibe la
            foto del stock y responde solo con eso.
          </p>
        </article>
      ) : null}
    </section>
  );
}
