"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import type { Categoria, MovementType } from "@/app/generated/prisma/enums";
import { registrarMovimiento } from "@/lib/actions";
import type { LocationDTO, MovementInput, MovementItemInput } from "@/lib/types";
import {
  ErrorBanner,
  Field,
  SubmitButton,
  fieldClass,
  hoyISO,
  textareaClass,
} from "./FormBits";
import {
  CATEGORIAS,
  MOVEMENT_TYPES,
  TIPOS_SALIDA_A_CLIENTE,
  VARIEDADES,
  formatEntero,
  formatKg,
} from "./format";

type Props = {
  locations: LocationDTO[];
};

type LineState = {
  id: number;
  variedad: string;
  lote: string;
  kg: string;
  bolsas: string;
  categoria: string;
};

export function MovementForm({ locations }: Props) {
  const router = useRouter();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // El id solo distingue filas para React; no viaja al servidor. El ref no se
  // puede leer durante el render, así que la primera línea se crea con id fijo
  // y el contador arranca después de ella.
  const nextLineId = useRef(1);
  function emptyLine(lineId: number): LineState {
    return { id: lineId, variedad: "", lote: "", kg: "", bolsas: "", categoria: "" };
  }
  function makeEmptyLine(): LineState {
    const lineId = nextLineId.current;
    nextLineId.current += 1;
    return emptyLine(lineId);
  }
  const [lines, setLines] = useState<LineState[]>(() => [emptyLine(0)]);
  // El tipo decide qué campos tienen sentido: pedir cliente en un envío a frío
  // es ruido, y no pedirlo en una entrega es perder el dato.
  const [tipo, setTipo] = useState<MovementType | "">("");

  const propias = locations.filter((l) => l.esPropia);
  const otras = locations.filter((l) => !l.esPropia);
  const variedadesId = `${id}-variedades`;
  const esSalidaACliente = tipo !== "" && TIPOS_SALIDA_A_CLIENTE.has(tipo);

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
    const tipoElegido = String(data.get("tipo") ?? "") as MovementType;
    const origenId = String(data.get("origenId") ?? "").trim();
    const destinoId = String(data.get("destinoId") ?? "").trim();
    const remito = String(data.get("remito") ?? "").trim();
    const fecha = String(data.get("fecha") ?? "").trim();
    const transporte = String(data.get("transporte") ?? "").trim();
    const cliente = String(data.get("cliente") ?? "").trim();
    const observaciones = String(data.get("observaciones") ?? "").trim();
    const rawInput = String(data.get("rawInput") ?? "").trim();

    if (!tipoElegido) {
      setError("Elegí el tipo de movimiento.");
      return;
    }
    if (!origenId || !destinoId) {
      setError("Elegí origen y destino.");
      return;
    }
    if (origenId === destinoId) {
      setError("El origen y el destino no pueden ser la misma ubicación.");
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

      items.push({
        variedad,
        lote,
        kg,
        bolsas,
        categoria: line.categoria ? (line.categoria as Categoria) : null,
      });
    }

    const input: MovementInput = {
      tipo: tipoElegido,
      // El input de fecha da solo el día. Se le pega el mediodía para que el
      // movimiento caiga en la jornada correcta en cualquier huso, en vez de
      // correrse al día anterior con la medianoche UTC.
      fecha: fecha ? new Date(`${fecha}T12:00:00`).toISOString() : undefined,
      origenId,
      destinoId,
      remito: remito || null,
      transporte: transporte || null,
      cliente: cliente || null,
      observaciones: observaciones || null,
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
      setTipo("");
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
        <ErrorBanner message={error} />

        {/* Cuatro columnas: la cabecera del remito entra en una sola fila y
            deja toda la altura para las líneas, que es donde se tipea. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Tipo" htmlFor={`${id}-tipo`}>
            <select
              id={`${id}-tipo`}
              name="tipo"
              required
              disabled={pending}
              className={fieldClass}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as MovementType)}
            >
              <option value="" disabled>
                Elegí un tipo
              </option>
              {MOVEMENT_TYPES.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Fecha"
            htmlFor={`${id}-fecha`}
            hint="La del remito, no la de la carga."
          >
            <input
              id={`${id}-fecha`}
              name="fecha"
              type="date"
              disabled={pending}
              className={fieldClass}
              defaultValue={hoyISO()}
            />
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

          <Field label="Transporte" htmlFor={`${id}-transporte`}>
            <input
              id={`${id}-transporte`}
              name="transporte"
              type="text"
              disabled={pending}
              className={fieldClass}
              placeholder="Quién lo llevó"
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

          {esSalidaACliente ? (
            <Field label="Cliente" htmlFor={`${id}-cliente`}>
              <input
                id={`${id}-cliente`}
                name="cliente"
                type="text"
                disabled={pending}
                className={fieldClass}
                placeholder="A quién se le entrega"
                autoComplete="off"
              />
            </Field>
          ) : null}
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
              const categoriaFieldId = `${id}-item-${line.id}-categoria`;

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

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
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

                    {/* La categoría comercial se conoce recién después de
                        tamañar: en los ingresos desde campo se deja vacía a
                        propósito y la asigna el movimiento de aguas abajo. */}
                    <Field label="Categoría" htmlFor={categoriaFieldId}>
                      <select
                        id={categoriaFieldId}
                        disabled={pending}
                        className={fieldClass}
                        value={line.categoria}
                        onChange={(e) =>
                          updateLine(line.id, { categoria: e.target.value })
                        }
                      >
                        <option value="">Sin clasificar</option>
                        {CATEGORIAS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
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

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Field label="Observaciones (opcional)" htmlFor={`${id}-obs`}>
            <textarea
              id={`${id}-obs`}
              name="observaciones"
              rows={2}
              disabled={pending}
              className={textareaClass}
              placeholder="Lo que haya que aclarar del viaje o de la carga."
            />
          </Field>

          <Field label="Texto del remito (opcional)" htmlFor={`${id}-raw`}>
            <textarea
              id={`${id}-raw`}
              name="rawInput"
              rows={2}
              disabled={pending}
              className={textareaClass}
              placeholder="Pegá el detalle si lo tenés. Queda guardado como respaldo de lo cargado."
            />
          </Field>
        </div>

        <div className="flex items-center justify-end">
          <SubmitButton
            pending={pending}
            idle="Registrar movimiento"
            busy="Registrando…"
            icon={<Plus size={18} weight="bold" aria-hidden />}
          />
        </div>
      </form>
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
