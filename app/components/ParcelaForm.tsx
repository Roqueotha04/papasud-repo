"use client";

import { Plant } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import {
  crearParcela,
  type CampaniaSelect,
  type CrearParcelaInput,
} from "@/lib/actions/altas";
import {
  ErrorBanner,
  Field,
  OkBanner,
  SubmitButton,
  fieldClass,
  formClass,
} from "./FormBits";
import { VARIEDADES } from "./format";

type Props = {
  campanias: CampaniaSelect[];
};

export function ParcelaForm({ campanias }: Props) {
  const router = useRouter();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const variedadesId = `${id}-variedades`;
  const sinCampanias = campanias.length === 0;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const codigo = String(data.get("codigo") ?? "").trim();
    const variedad = String(data.get("variedad") ?? "").trim();
    const campaniaId = String(data.get("campaniaId") ?? "").trim();
    const pivote = String(data.get("pivote") ?? "").trim();
    const superficieRaw = String(data.get("superficieHa") ?? "").trim();
    const tercioRaw = String(data.get("tercio") ?? "").trim();

    if (!codigo) {
      setError("Ingresá el código de la parcela.");
      return;
    }
    if (!variedad) {
      setError("Ingresá la variedad sembrada.");
      return;
    }
    if (!campaniaId) {
      setError("Elegí la campaña.");
      return;
    }

    const superficieHa = Number(superficieRaw.replace(",", "."));
    if (!Number.isFinite(superficieHa) || superficieHa <= 0) {
      setError("La superficie tiene que ser un número mayor a 0.");
      return;
    }

    let tercio: number | null = null;
    if (tercioRaw) {
      const parsed = Number(tercioRaw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) {
        setError("El tercio tiene que ser 1, 2 o 3.");
        return;
      }
      tercio = parsed;
    }

    const input: CrearParcelaInput = {
      codigo,
      variedad,
      superficieHa,
      campaniaId,
      pivote: pivote || null,
      tercio,
    };

    setError(null);
    setOk(null);
    startTransition(async () => {
      const result = await crearParcela(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setOk(`Parcela ${codigo} dada de alta.`);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={formClass()} noValidate>
      <ErrorBanner message={error} />
      <OkBanner message={ok} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Código" htmlFor={`${id}-codigo`} hint="Como figura en la planilla: 37A, 41, 34B.">
          <input
            id={`${id}-codigo`}
            name="codigo"
            type="text"
            required
            disabled={pending}
            className={fieldClass}
            placeholder="37A"
            autoComplete="off"
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
        </Field>

        <Field label="Superficie (ha)" htmlFor={`${id}-superficie`}>
          <input
            id={`${id}-superficie`}
            name="superficieHa"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            required
            disabled={pending}
            className={`${fieldClass} num`}
            placeholder="13"
          />
        </Field>

        <Field label="Campaña" htmlFor={`${id}-campania`}>
          <select
            id={`${id}-campania`}
            name="campaniaId"
            required
            disabled={pending || sinCampanias}
            className={fieldClass}
            defaultValue={campanias.length === 1 ? campanias[0].id : ""}
          >
            <option value="" disabled>
              {sinCampanias ? "No hay campañas cargadas" : "Elegí la campaña"}
            </option>
            {campanias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Pivote" htmlFor={`${id}-pivote`} hint="Opcional. Unidad de riego: A, B, C.">
          <input
            id={`${id}-pivote`}
            name="pivote"
            type="text"
            disabled={pending}
            className={fieldClass}
            placeholder="Opcional"
            autoComplete="off"
          />
        </Field>

        <Field label="Tercio" htmlFor={`${id}-tercio`} hint="Opcional. 1, 2 o 3.">
          <input
            id={`${id}-tercio`}
            name="tercio"
            type="number"
            inputMode="numeric"
            min={1}
            max={3}
            step={1}
            disabled={pending}
            className={`${fieldClass} num`}
            placeholder="Opcional"
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
          idle="Dar de alta parcela"
          busy="Guardando…"
          icon={<Plant size={18} weight="fill" aria-hidden />}
        />
      </div>
    </form>
  );
}
