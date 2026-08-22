"use client";

import { CircleNotch, Plus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import type { MovementType } from "@/app/generated/prisma/enums";
import { registrarMovimiento } from "@/lib/actions";
import type { LocationDTO, MovementInput } from "@/lib/types";
import { MOVEMENT_TYPES, VARIEDADES } from "./format";

type Props = {
  locations: LocationDTO[];
};

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-ink outline-none transition-colors placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export function MovementForm({ locations }: Props) {
  const router = useRouter();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const propias = locations.filter((l) => l.esPropia);
  const otras = locations.filter((l) => !l.esPropia);
  const variedadesId = `${id}-variedades`;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const tipo = String(data.get("tipo") ?? "") as MovementType;
    const origenId = String(data.get("origenId") ?? "").trim();
    const destinoId = String(data.get("destinoId") ?? "").trim();
    const variedad = String(data.get("variedad") ?? "").trim();
    const lote = String(data.get("lote") ?? "").trim();
    const kgRaw = String(data.get("kg") ?? "").trim();
    const bolsasRaw = String(data.get("bolsas") ?? "").trim();
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
    if (!variedad || !lote) {
      setError("Completá variedad y lote.");
      return;
    }

    const kg = Number(kgRaw.replace(",", "."));
    if (!Number.isFinite(kg) || kg <= 0) {
      setError("Ingresá los kilogramos (un número mayor a 0).");
      return;
    }

    let bolsas: number | null = null;
    if (bolsasRaw) {
      const parsed = Number(bolsasRaw.replace(",", "."));
      if (!Number.isInteger(parsed) || parsed < 0) {
        setError("Bolsas tiene que ser un entero mayor o igual a 0.");
        return;
      }
      bolsas = parsed;
    }

    const input: MovementInput = {
      tipo,
      origenId,
      destinoId,
      remito: remito || null,
      rawInput: rawInput || null,
      items: [{ variedad, lote, kg, bolsas }],
    };

    setError(null);
    startTransition(async () => {
      const result = await registrarMovimiento(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <section id="registrar" className="flex min-w-0 flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Registrar movimiento</h2>

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

          <Field label="Variedad" htmlFor={`${id}-variedad`}>
            <input
              id={`${id}-variedad`}
              name="variedad"
              type="text"
              required
              disabled={pending}
              className={fieldClass}
              placeholder="agata, spunta…"
              list={variedadesId}
              autoComplete="off"
            />
            <datalist id={variedadesId}>
              {VARIEDADES.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </Field>

          <Field label="Lote" htmlFor={`${id}-lote`}>
            <input
              id={`${id}-lote`}
              name="lote"
              type="text"
              required
              disabled={pending}
              className={fieldClass}
              placeholder="Código de lote"
              autoComplete="off"
            />
          </Field>

          <Field label="Kilogramos" htmlFor={`${id}-kg`}>
            <input
              id={`${id}-kg`}
              name="kg"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              required
              disabled={pending}
              className={`${fieldClass} num`}
              placeholder="0"
            />
          </Field>

          <Field label="Bolsas" htmlFor={`${id}-bolsas`}>
            <input
              id={`${id}-bolsas`}
              name="bolsas"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              disabled={pending}
              className={`${fieldClass} num`}
              placeholder="Opcional"
            />
          </Field>
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
    </section>
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
