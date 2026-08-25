"use client";

import { ClipboardText } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import {
  crearConteo,
  type CrearConteoInput,
  type UbicacionSelect,
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
import { VARIEDADES } from "./format";

type Props = {
  ubicaciones: UbicacionSelect[];
};

export function ConteoForm({ ubicaciones }: Props) {
  const router = useRouter();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const variedadesId = `${id}-variedades`;
  const sinUbicaciones = ubicaciones.length === 0;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const locationId = String(data.get("locationId") ?? "").trim();
    const variedad = String(data.get("variedad") ?? "").trim();
    const lote = String(data.get("lote") ?? "").trim();
    const kgRaw = String(data.get("kgContado") ?? "").trim();
    const fecha = String(data.get("fecha") ?? "").trim();

    if (!locationId) {
      setError("Elegí la ubicación donde se hizo el conteo.");
      return;
    }
    if (!variedad) {
      setError("Ingresá la variedad contada.");
      return;
    }
    if (!lote) {
      setError("Ingresá el lote contado.");
      return;
    }

    const kgContado = Number(kgRaw.replace(",", "."));
    if (!Number.isFinite(kgContado) || kgContado < 0) {
      setError("Los kilos contados tienen que ser un número mayor o igual a 0.");
      return;
    }
    if (!fecha) {
      setError("Ingresá la fecha del conteo.");
      return;
    }

    const input: CrearConteoInput = {
      locationId,
      variedad,
      lote,
      kgContado,
      fecha: new Date(`${fecha}T12:00:00`).toISOString(),
    };

    setError(null);
    setOk(null);
    startTransition(async () => {
      const result = await crearConteo(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setOk(
        `Conteo asentado. Si difiere de lo que dicen los movimientos, aparece arriba como discrepancia.`,
      );
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={formClass()} noValidate>
      <ErrorBanner message={error} />
      <OkBanner message={ok} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Ubicación" htmlFor={`${id}-ubicacion`}>
          <select
            id={`${id}-ubicacion`}
            name="locationId"
            required
            disabled={pending || sinUbicaciones}
            className={fieldClass}
            defaultValue=""
          >
            <option value="" disabled>
              {sinUbicaciones ? "No hay ubicaciones propias" : "Elegí el depósito"}
            </option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
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
        </Field>

        <Field label="Lote" htmlFor={`${id}-lote`}>
          <input
            id={`${id}-lote`}
            name="lote"
            type="text"
            required
            disabled={pending}
            className={fieldClass}
            placeholder="221"
            autoComplete="off"
          />
        </Field>

        <Field
          label="Kilos contados"
          htmlFor={`${id}-kg`}
          hint="Lo que se contó físicamente, no lo que dice el sistema."
        >
          <input
            id={`${id}-kg`}
            name="kgContado"
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

        <Field label="Fecha del conteo" htmlFor={`${id}-fecha`}>
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
      </div>

      <datalist id={variedadesId}>
        {VARIEDADES.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>

      <div className="flex items-center justify-end">
        <SubmitButton
          pending={pending}
          idle="Asentar conteo"
          busy="Guardando…"
          icon={<ClipboardText size={18} weight="fill" aria-hidden />}
        />
      </div>
    </form>
  );
}
