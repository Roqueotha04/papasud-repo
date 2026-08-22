"use client";

import { CircleNotch, Plus, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import type { MovementType } from "@/app/generated/prisma/enums";
import { registrarMovimiento } from "@/lib/actions";
import type { LocationDTO, MovementInput, MovementItemInput } from "@/lib/types";
import { MOVEMENT_TYPES, VARIEDADES, formatEntero, formatKg } from "./format";

type Props = {
  locations: LocationDTO[];
};

type LineState = {
  id: number;
  variedad: string;
  lote: string;
  kg: string;
  bolsas: string;
};

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-ink outline-none transition-colors placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export function MovementForm({ locations }: Props) {
  const router = useRouter();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nextLineId = useRef(1);
  function makeEmptyLine(): LineState {
    const lineId = nextLineId.current;
    nextLineId.current += 1;
    return { id: lineId, variedad: "", lote: "", kg: "", bolsas: "" };
  }
  const [lines, setLines] = useState<LineState[]>(() => [makeEmptyLine()]);

  const propias = locations.filter((l) => l.esPropia);
  const otras = locations.filter((l) => !l.esPropia);
  const variedadesId = `${id}-variedades`;

  const totals = useMemo(() => {
    let kg = 0;
    let bolsas = 0;
    for (const line of lines) {
      const kgNum = Number(line.kg.replace(",", "."));
      if (Number.isFinite(kgNum)) kg += kgNum;
      const bolsasNum = Number(line.bolsas.replace(",", "."));
      if (Number.isFinite(bolsasNum)) bolsas += bolsasNum;
    }
    return { kg, bolsas };
  }, [lines]);

  function updateLine(lineId: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
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
    const tipo = String(data.get("tipo") ?? "") as MovementType;
    const origenId = String(data.get("origenId") ?? "").trim();
    const destinoId = String(data.get("destinoId") ?? "").trim();
    const remito = String(data.get("remito") ?? "").trim();
    const rawInput = String(data.get("rawInput") ?? "").trim();

    if (!tipo) {
      setError("Elegí el tipo de movimiento.");
      return;
    }
    if (!origenId || !destinoId) {
      setError("Elegí origen y destino.");
      return;
    }

    const items: MovementItemInput[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const n = i + 1;
      const variedad = line.variedad.trim();
      const lote = line.lote.trim();

      if (!variedad) {
        setError(`Línea ${n}: falta la variedad.`);
        return;
      }
      if (!lote) {
        setError(`Línea ${n}: falta el lote.`);
        return;
      }

      const kg = Number(line.kg.replace(",", "."));
      if (!Number.isFinite(kg) || kg <= 0) {
        setError(`Línea ${n}: ingresá los kilogramos (un número mayor a 0).`);
        return;
      }

      let bolsas: number | null = null;
      if (line.bolsas.trim()) {
        const parsed = Number(line.bolsas.replace(",", "."));
        if (!Number.isInteger(parsed) || parsed < 0) {
          setError(`Línea ${n}: bolsas tiene que ser un entero mayor o igual a 0.`);
          return;
        }
        bolsas = parsed;
      }

      items.push({ variedad, lote, kg, bolsas });
    }

    const input: MovementInput = {
      tipo,
      origenId,
      destinoId,
      remito: remito || null,
      rawInput: rawInput || null,
      items,
    };

    setError(null);
    startTransition(async () => {
      const result = await registrarMovimiento(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setLines([makeEmptyLine()]);
      router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card"
        noValidate
      >
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tipo" htmlFor={`${id}-tipo`}>
            <select
              id={`${id}-tipo`}
              name="tipo"
              required
              disabled={pending}
              className={fieldClass}
              defaultValue=""
            >
              <option value="" disabled>
                Elegí un tipo
              </option>
              {MOVEMENT_TYPES.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Remito" htmlFor={`${id}-remito`}>
            <input
              id={`${id}-remito`}
              name="remito"
              type="text"
              disabled={pending}
              className={fieldClass}
              placeholder="Nro. de remito"
              autoComplete="off"
            />
          </Field>

          <Field label="Origen" htmlFor={`${id}-origen`}>
            <LocationSelect
              id={`${id}-origen`}
              name="origenId"
              locations={locations}
              propias={propias}
              otras={otras}
              disabled={pending}
              placeholder="Elegí origen"
            />
          </Field>

          <Field label="Destino" htmlFor={`${id}-destino`}>
            <LocationSelect
              id={`${id}-destino`}
              name="destinoId"
              locations={locations}
              propias={propias}
              otras={otras}
              disabled={pending}
              placeholder="Elegí destino"
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-ink">Líneas del remito</h3>
            <button
              type="button"
              onClick={addLine}
              disabled={pending}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-accent/10 disabled:opacity-60"
            >
              <Plus size={14} weight="bold" aria-hidden />
              Agregar línea
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {lines.map((line, index) => {
              const n = index + 1;
              const variedadFieldId = `${id}-item-${line.id}-variedad`;
              const loteFieldId = `${id}-item-${line.id}-lote`;
              const kgFieldId = `${id}-item-${line.id}-kg`;
              const bolsasFieldId = `${id}-item-${line.id}-bolsas`;

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

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="Variedad" htmlFor={variedadFieldId}>
                      <input
                        id={variedadFieldId}
                        type="text"
                        required
                        disabled={pending}
                        className={fieldClass}
                        placeholder="agata, spunta…"
                        list={variedadesId}
                        autoComplete="off"
                        value={line.variedad}
                        onChange={(e) => updateLine(line.id, { variedad: e.target.value })}
                      />
                    </Field>

                    <Field label="Lote" htmlFor={loteFieldId}>
                      <input
                        id={loteFieldId}
                        type="text"
                        required
                        disabled={pending}
                        className={fieldClass}
                        placeholder="Código de lote"
                        autoComplete="off"
                        value={line.lote}
                        onChange={(e) => updateLine(line.id, { lote: e.target.value })}
                      />
                    </Field>

                    <Field label="Kilogramos" htmlFor={kgFieldId}>
                      <input
                        id={kgFieldId}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        required
                        disabled={pending}
                        className={`${fieldClass} num`}
                        placeholder="0"
                        value={line.kg}
                        onChange={(e) => updateLine(line.id, { kg: e.target.value })}
                      />
                    </Field>

                    <Field label="Bolsas" htmlFor={bolsasFieldId}>
                      <input
                        id={bolsasFieldId}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        disabled={pending}
                        className={`${fieldClass} num`}
                        placeholder="Opcional"
                        value={line.bolsas}
                        onChange={(e) => updateLine(line.id, { bolsas: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>

          <datalist id={variedadesId}>
            {VARIEDADES.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>

          <div className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 text-sm">
            <span className="text-muted">Total del remito</span>
            <span className="num text-ink">
              {formatKg(totals.kg)} kg · {formatEntero(totals.bolsas)} bolsas
            </span>
          </div>
        </div>

        <Field label="Texto del remito (opcional)" htmlFor={`${id}-raw`}>
          <textarea
            id={`${id}-raw`}
            name="rawInput"
            rows={2}
            disabled={pending}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            placeholder="Pegá el detalle si lo tenés. El parseo automático llega más adelante."
          />
        </Field>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent-strong px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? (
              <CircleNotch size={18} className="spin" aria-hidden />
            ) : (
              <Plus size={18} weight="bold" aria-hidden />
            )}
            {pending ? "Registrando…" : "Registrar movimiento"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

function LocationSelect({
  id,
  name,
  locations,
  propias,
  otras,
  disabled,
  placeholder,
}: {
  id: string;
  name: string;
  locations: LocationDTO[];
  propias: LocationDTO[];
  otras: LocationDTO[];
  disabled: boolean;
  placeholder: string;
}) {
  const empty = locations.length === 0;

  return (
    <select
      id={id}
      name={name}
      required
      disabled={disabled || empty}
      className={fieldClass}
      defaultValue=""
    >
      <option value="" disabled>
        {empty ? "No hay ubicaciones cargadas" : placeholder}
      </option>
      {propias.length > 0 ? (
        <optgroup label="Propias">
          {propias.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.nombre}
            </option>
          ))}
        </optgroup>
      ) : null}
      {otras.length > 0 ? (
        <optgroup label="Otras">
          {otras.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.nombre}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}
