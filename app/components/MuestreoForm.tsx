"use client";

import { Flask, Plus, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  crearMuestreo,
  type CrearMuestreoInput,
  type ParcelaSelect,
} from "@/lib/actions/altas";
import {
  ErrorBanner,
  Field,
  OkBanner,
  SubmitButton,
  fieldClass,
  formClass,
  hoyISO,
} from "./FormBits";
import { formatEntero, formatKg } from "./format";

type Props = {
  parcelas: ParcelaSelect[];
};

type CalibreState = {
  id: number;
  rango: string;
  pesoKg: string;
  cantidad: string;
};

// Los rangos que usa la planilla de Oriente. Se ofrecen como sugerencia para que
// dos muestreos de la misma parcela sean comparables entre sí.
const RANGOS_SUGERIDOS = [
  "menor a 30",
  "30-45",
  "45-55",
  "55-65",
  "65-75",
  "mayor a 75",
];

export function MuestreoForm({ parcelas }: Props) {
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
  function emptyLine(lineId: number): CalibreState {
    return { id: lineId, rango: "", pesoKg: "", cantidad: "" };
  }
  function makeEmptyLine(): CalibreState {
    const lineId = nextLineId.current;
    nextLineId.current += 1;
    return emptyLine(lineId);
  }
  const [lines, setLines] = useState<CalibreState[]>(() => [emptyLine(0)]);

  const rangosId = `${id}-rangos`;
  const sinParcelas = parcelas.length === 0;

  const totals = useMemo(() => {
    let peso = 0;
    let cantidad = 0;
    for (const line of lines) {
      const p = Number(line.pesoKg.replace(",", "."));
      if (Number.isFinite(p)) peso += p;
      const c = Number(line.cantidad.replace(",", "."));
      if (Number.isFinite(c)) cantidad += c;
    }
    return { peso, cantidad };
  }, [lines]);

  function updateLine(lineId: number, patch: Partial<CalibreState>) {
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
    const parcelaId = String(data.get("parcelaId") ?? "").trim();
    const fecha = String(data.get("fecha") ?? "").trim();
    const tratamiento = String(data.get("tratamiento") ?? "").trim();
    const pesoRaw = String(data.get("pesoTotalKg") ?? "").trim();
    const nRaw = String(data.get("nTuberculos") ?? "").trim();
    const tallosRaw = String(data.get("tallos") ?? "").trim();
    const tallosMetroRaw = String(data.get("tallosPorMetro") ?? "").trim();

    if (!parcelaId) {
      setError("Elegí la parcela muestreada.");
      return;
    }
    if (!fecha) {
      setError("Ingresá la fecha del muestreo.");
      return;
    }

    const pesoTotalKg = Number(pesoRaw.replace(",", "."));
    if (!Number.isFinite(pesoTotalKg) || pesoTotalKg <= 0) {
      setError("El peso total de la muestra tiene que ser mayor a 0.");
      return;
    }

    const nTuberculos = Number(nRaw);
    if (!Number.isInteger(nTuberculos) || nTuberculos <= 0) {
      setError("La cantidad de tubérculos tiene que ser un entero mayor a 0.");
      return;
    }

    let tallos: number | null = null;
    if (tallosRaw) {
      const parsed = Number(tallosRaw);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setError("Los tallos tienen que ser un entero mayor o igual a 0.");
        return;
      }
      tallos = parsed;
    }

    let tallosPorMetro: number | null = null;
    if (tallosMetroRaw) {
      const parsed = Number(tallosMetroRaw.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Los tallos por metro tienen que ser mayor o igual a 0.");
        return;
      }
      tallosPorMetro = parsed;
    }

    const calibres: CrearMuestreoInput["calibres"] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const n = i + 1;
      const rango = line.rango.trim();

      if (!rango) {
        setError(`Calibre ${n}: falta el rango.`);
        return;
      }

      const pesoKg = Number(line.pesoKg.replace(",", "."));
      if (!Number.isFinite(pesoKg) || pesoKg < 0) {
        setError(`Calibre ${n}: el peso tiene que ser un número mayor o igual a 0.`);
        return;
      }

      const cantidad = Number(line.cantidad);
      if (!Number.isInteger(cantidad) || cantidad < 0) {
        setError(`Calibre ${n}: la cantidad tiene que ser un entero mayor o igual a 0.`);
        return;
      }

      calibres.push({ rango, pesoKg, cantidad });
    }

    const input: CrearMuestreoInput = {
      parcelaId,
      fecha: new Date(`${fecha}T12:00:00`).toISOString(),
      tratamiento: tratamiento || null,
      pesoTotalKg,
      nTuberculos,
      tallos,
      tallosPorMetro,
      calibres,
    };

    setError(null);
    setOk(null);
    startTransition(async () => {
      const result = await crearMuestreo(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setLines([makeEmptyLine()]);
      setOk("Muestreo cargado. Ya se proyecta el reparto por calibre de esa parcela.");
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={formClass()} noValidate>
      <ErrorBanner message={error} />
      <OkBanner message={ok} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Parcela" htmlFor={`${id}-parcela`}>
          <select
            id={`${id}-parcela`}
            name="parcelaId"
            required
            disabled={pending || sinParcelas}
            className={fieldClass}
            defaultValue=""
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

        <Field label="Fecha" htmlFor={`${id}-fecha`}>
          <input
            id={`${id}-fecha`}
            name="fecha"
            type="date"
            required
            disabled={pending}
            className={`${fieldClass} num`}
            defaultValue={hoyISO()}
          />
        </Field>

        <Field
          label="Tratamiento"
          htmlFor={`${id}-tratamiento`}
          hint="Opcional. Para comparar contra el testigo: Rootex, S-Rootex."
        >
          <input
            id={`${id}-tratamiento`}
            name="tratamiento"
            type="text"
            disabled={pending}
            className={fieldClass}
            placeholder="Opcional"
            autoComplete="off"
          />
        </Field>

        <Field label="Peso total de la muestra (kg)" htmlFor={`${id}-peso`}>
          <input
            id={`${id}-peso`}
            name="pesoTotalKg"
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

        <Field label="Tubérculos" htmlFor={`${id}-n`}>
          <input
            id={`${id}-n`}
            name="nTuberculos"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            disabled={pending}
            className={`${fieldClass} num`}
            placeholder="180"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tallos" htmlFor={`${id}-tallos`}>
            <input
              id={`${id}-tallos`}
              name="tallos"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              disabled={pending}
              className={`${fieldClass} num`}
              placeholder="Opc."
            />
          </Field>

          <Field label="Tallos/m" htmlFor={`${id}-tallos-metro`}>
            <input
              id={`${id}-tallos-metro`}
              name="tallosPorMetro"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              disabled={pending}
              className={`${fieldClass} num`}
              placeholder="Opc."
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink">Distribución por calibre</h3>
          <button
            type="button"
            onClick={addLine}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-accent/10 disabled:opacity-60"
          >
            <Plus size={14} weight="bold" aria-hidden />
            Agregar calibre
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {lines.map((line, index) => {
            const n = index + 1;
            const rangoFieldId = `${id}-cal-${line.id}-rango`;
            const pesoFieldId = `${id}-cal-${line.id}-peso`;
            const cantFieldId = `${id}-cal-${line.id}-cant`;

            return (
              <div
                key={line.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted">
                    Calibre {n}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={pending || lines.length === 1}
                    aria-label={`Quitar calibre ${n}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:pointer-events-none disabled:opacity-0"
                  >
                    <Trash size={16} aria-hidden />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Field label="Rango (mm)" htmlFor={rangoFieldId}>
                    <input
                      id={rangoFieldId}
                      type="text"
                      required
                      disabled={pending}
                      className={fieldClass}
                      placeholder="45-55"
                      list={rangosId}
                      autoComplete="off"
                      value={line.rango}
                      onChange={(e) => updateLine(line.id, { rango: e.target.value })}
                    />
                  </Field>

                  <Field label="Peso (kg)" htmlFor={pesoFieldId}>
                    <input
                      id={pesoFieldId}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      required
                      disabled={pending}
                      className={`${fieldClass} num`}
                      placeholder="0"
                      value={line.pesoKg}
                      onChange={(e) => updateLine(line.id, { pesoKg: e.target.value })}
                    />
                  </Field>

                  <Field label="Cantidad" htmlFor={cantFieldId}>
                    <input
                      id={cantFieldId}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      required
                      disabled={pending}
                      className={`${fieldClass} num`}
                      placeholder="0"
                      value={line.cantidad}
                      onChange={(e) => updateLine(line.id, { cantidad: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>

        <datalist id={rangosId}>
          {RANGOS_SUGERIDOS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>

        <div className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 text-sm">
          <span className="text-muted">Suma de los calibres</span>
          <span className="num text-ink">
            {formatKg(totals.peso)} kg · {formatEntero(totals.cantidad)} tubérculos
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <SubmitButton
          pending={pending}
          idle="Guardar muestreo"
          busy="Guardando…"
          icon={<Flask size={18} weight="fill" aria-hidden />}
        />
      </div>
    </form>
  );
}
