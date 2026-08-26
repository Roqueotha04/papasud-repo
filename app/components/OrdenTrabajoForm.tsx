"use client";

import { ClipboardText, Plus, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import type { EstadoOrden, Herramienta } from "@/app/generated/prisma/enums";
import {
  crearOrdenTrabajo,
  type CrearOrdenInput,
  type InsumoSelect,
  type ParcelaSelect,
} from "@/lib/actions/altas";
import {
  CATEGORIA_LABEL,
  ESTADOS_ORDEN,
  HERRAMIENTAS,
  formatUsd,
} from "@/lib/ordenes-format";
import {
  ErrorBanner,
  Field,
  OkBanner,
  SubmitButton,
  fieldClass,
  formClass,
  textareaClass,
} from "./FormBits";

type Props = {
  parcelas: ParcelaSelect[];
  insumos: InsumoSelect[];
};

type LineState = {
  id: number;
  insumoId: string;
  dosisHa: string;
};

export function OrdenTrabajoForm({ parcelas, insumos }: Props) {
  const router = useRouter();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // El id solo distingue filas para React; no viaja al servidor. El ref no se
  // puede leer durante el render, así que la primera línea se crea con id fijo
  // y el contador arranca después de ella.
  const nextLineId = useRef(1);
  function emptyLine(lineId: number): LineState {
    return { id: lineId, insumoId: "", dosisHa: "" };
  }
  function makeEmptyLine(): LineState {
    const lineId = nextLineId.current;
    nextLineId.current += 1;
    return emptyLine(lineId);
  }
  const [lines, setLines] = useState<LineState[]>(() => [emptyLine(0)]);

  // La superficie sale de la parcela elegida: es lo que convierte una dosis por
  // hectárea en litros y en plata. Se sigue en estado para poder mostrar el
  // costo antes de guardar.
  const [parcelaId, setParcelaId] = useState("");
  const parcela = parcelas.find((p) => p.id === parcelaId);
  const insumoById = useMemo(
    () => new Map(insumos.map((i) => [i.id, i])),
    [insumos],
  );

  const sinParcelas = parcelas.length === 0;
  const sinInsumos = insumos.length === 0;

  const costoTotal = useMemo(() => {
    if (!parcela) return 0;
    let total = 0;
    for (const line of lines) {
      const insumo = insumoById.get(line.insumoId);
      if (!insumo) continue;
      const dosis = Number(line.dosisHa.replace(",", "."));
      if (!Number.isFinite(dosis)) continue;
      total += dosis * parcela.superficieHa * insumo.precioUsd;
    }
    return total;
  }, [lines, parcela, insumoById]);

  function updateLine(lineId: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
  }

  /** Al elegir un insumo se prellena su dosis recomendada, que es la que se usa casi siempre. */
  function onInsumoChange(lineId: number, insumoId: string) {
    const insumo = insumoById.get(insumoId);
    updateLine(lineId, {
      insumoId,
      dosisHa: insumo ? String(insumo.dosisHaRecomendada) : "",
    });
  }

  function addLine() {
    setLines((prev) => [...prev, makeEmptyLine()]);
  }

  function removeLine(lineId: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== lineId)));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const fechaEmision = String(data.get("fechaEmision") ?? "").trim();
    const fechaTarea = String(data.get("fechaTarea") ?? "").trim();
    const aplicador = String(data.get("aplicador") ?? "").trim();
    const herramienta = String(data.get("herramienta") ?? "") as Herramienta;
    const estado = String(data.get("estado") ?? "") as EstadoOrden;
    const observaciones = String(data.get("observaciones") ?? "").trim();

    if (!parcelaId) {
      setError("Elegí la parcela sobre la que se aplica.");
      return;
    }
    if (!fechaEmision) {
      setError("Ingresá la fecha de emisión.");
      return;
    }
    if (!fechaTarea) {
      setError("Ingresá la fecha y hora de la tarea.");
      return;
    }
    if (!aplicador) {
      setError("Ingresá quién aplica.");
      return;
    }
    if (!herramienta) {
      setError("Elegí la herramienta.");
      return;
    }

    const lineas: CrearOrdenInput["lineas"] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const n = i + 1;

      if (!line.insumoId) {
        setError(`Línea ${n}: elegí el insumo.`);
        return;
      }

      const dosisHa = Number(line.dosisHa.replace(",", "."));
      if (!Number.isFinite(dosisHa) || dosisHa <= 0) {
        setError(`Línea ${n}: la dosis por hectárea tiene que ser mayor a 0.`);
        return;
      }

      lineas.push({ insumoId: line.insumoId, dosisHa });
    }

    const input: CrearOrdenInput = {
      parcelaId,
      fechaEmision: new Date(`${fechaEmision}T09:00:00`).toISOString(),
      fechaTarea: new Date(fechaTarea).toISOString(),
      aplicador,
      herramienta,
      estado: estado || "EMITIDA",
      observaciones: observaciones || null,
      lineas,
    };

    setError(null);
    setOk(null);
    startTransition(async () => {
      const result = await crearOrdenTrabajo(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setLines([makeEmptyLine()]);
      setParcelaId("");
      setOk("Orden de trabajo cargada.");
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={formClass()} noValidate>
      <ErrorBanner message={error} />
      <OkBanner message={ok} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Parcela"
          htmlFor={`${id}-parcela`}
          hint={parcela ? `${parcela.superficieHa} ha` : undefined}
        >
          <select
            id={`${id}-parcela`}
            name="parcelaId"
            required
            disabled={pending || sinParcelas}
            className={fieldClass}
            value={parcelaId}
            onChange={(e) => setParcelaId(e.target.value)}
          >
            <option value="" disabled>
              {sinParcelas ? "No hay parcelas cargadas" : "Elegí la parcela"}
            </option>
            {parcelas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} · {p.variedad}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fecha de emisión" htmlFor={`${id}-emision`}>
          <input
            id={`${id}-emision`}
            name="fechaEmision"
            type="date"
            required
            disabled={pending}
            className={`${fieldClass} num`}
          />
        </Field>

        <Field
          label="Fecha y hora de tarea"
          htmlFor={`${id}-tarea`}
          hint="Se aplica de madrugada o de noche, cuando no hay viento."
        >
          <input
            id={`${id}-tarea`}
            name="fechaTarea"
            type="datetime-local"
            required
            disabled={pending}
            className={`${fieldClass} num`}
          />
        </Field>

        <Field label="Aplicador" htmlFor={`${id}-aplicador`}>
          <input
            id={`${id}-aplicador`}
            name="aplicador"
            type="text"
            required
            disabled={pending}
            className={fieldClass}
            placeholder="Nombre del aplicador"
            autoComplete="off"
          />
        </Field>

        <Field label="Herramienta" htmlFor={`${id}-herramienta`}>
          <select
            id={`${id}-herramienta`}
            name="herramienta"
            required
            disabled={pending}
            className={fieldClass}
            defaultValue=""
          >
            <option value="" disabled>
              Elegí la herramienta
            </option>
            {HERRAMIENTAS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Estado" htmlFor={`${id}-estado`}>
          <select
            id={`${id}-estado`}
            name="estado"
            disabled={pending}
            className={fieldClass}
            defaultValue="EMITIDA"
          >
            {ESTADOS_ORDEN.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink">Insumos a aplicar</h3>
          <button
            type="button"
            onClick={addLine}
            disabled={pending || sinInsumos}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-accent/10 disabled:opacity-60"
          >
            <Plus size={14} weight="bold" aria-hidden />
            Agregar insumo
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {lines.map((line, index) => {
            const n = index + 1;
            const insumoFieldId = `${id}-linea-${line.id}-insumo`;
            const dosisFieldId = `${id}-linea-${line.id}-dosis`;
            const insumo = insumoById.get(line.insumoId);
            const dosis = Number(line.dosisHa.replace(",", "."));
            const costo =
              insumo && parcela && Number.isFinite(dosis)
                ? dosis * parcela.superficieHa * insumo.precioUsd
                : 0;

            return (
              <div
                key={line.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted">
                    Línea {n}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={pending || lines.length === 1}
                    aria-label={`Quitar línea ${n}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:pointer-events-none disabled:opacity-0"
                  >
                    <Trash size={16} aria-hidden />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <Field
                    label="Insumo"
                    htmlFor={insumoFieldId}
                    hint={
                      insumo
                        ? `${CATEGORIA_LABEL[insumo.categoria]} · ${insumo.principioActivo}`
                        : undefined
                    }
                  >
                    <select
                      id={insumoFieldId}
                      required
                      disabled={pending || sinInsumos}
                      className={fieldClass}
                      value={line.insumoId}
                      onChange={(e) => onInsumoChange(line.id, e.target.value)}
                    >
                      <option value="" disabled>
                        {sinInsumos ? "No hay insumos cargados" : "Elegí el insumo"}
                      </option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.marca}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label={`Dosis (${insumo?.unidad ?? "l/ha"})`}
                    htmlFor={dosisFieldId}
                    hint={costo > 0 ? `${formatUsd(costo)} U$S` : undefined}
                  >
                    <input
                      id={dosisFieldId}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      required
                      disabled={pending}
                      className={`${fieldClass} num`}
                      placeholder="0"
                      value={line.dosisHa}
                      onChange={(e) => updateLine(line.id, { dosisHa: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 text-sm">
          <span className="text-muted">
            {parcela
              ? `Costo de la aplicación sobre ${parcela.superficieHa} ha`
              : "Elegí una parcela para ver el costo"}
          </span>
          <span className="num text-ink">{formatUsd(costoTotal)} U$S</span>
        </div>
      </div>

      <Field label="Observaciones" htmlFor={`${id}-obs`}>
        <textarea
          id={`${id}-obs`}
          name="observaciones"
          rows={2}
          disabled={pending}
          className={textareaClass}
          placeholder="Opcional. Condiciones de aplicación, algo a tener en cuenta."
        />
      </Field>

      <div className="flex items-center justify-end">
        <SubmitButton
          pending={pending}
          idle="Emitir orden"
          busy="Guardando…"
          icon={<ClipboardText size={18} weight="fill" aria-hidden />}
        />
      </div>
    </form>
  );
}
