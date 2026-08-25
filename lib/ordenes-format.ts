// Etiquetas y formato de órdenes de trabajo. Sin dependencias: lo importan
// tanto server components como el formulario de alta, que corre en el browser.
//
// Vive separado de lib/ordenes.ts a propósito. Ese módulo importa Prisma, y si
// un client component lo toca, Turbopack intenta meter el driver de Postgres en
// el bundle del navegador y la compilación se cae entera.

import type {
  CategoriaInsumo,
  EstadoOrden,
  Herramienta,
} from "@/app/generated/prisma/enums";

export const HERRAMIENTA_LABEL: Record<Herramienta, string> = {
  DRONE: "Drone",
  PULVERIZADORA: "Pulverizadora",
};

export const ESTADO_LABEL: Record<EstadoOrden, string> = {
  BORRADOR: "Borrador",
  EMITIDA: "Emitida",
  EJECUTADA: "Ejecutada",
};

export const CATEGORIA_LABEL: Record<CategoriaInsumo, string> = {
  HERBICIDA: "Herbicida",
  INSECTICIDA: "Insecticida",
  FUNGICIDA: "Fungicida",
  COADYUVANTE: "Coadyuvante",
  OTRO: "Otro",
};

export const HERRAMIENTAS: { value: Herramienta; label: string }[] = [
  { value: "DRONE", label: "Drone" },
  { value: "PULVERIZADORA", label: "Pulverizadora" },
];

export const ESTADOS_ORDEN: { value: EstadoOrden; label: string }[] = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "EMITIDA", label: "Emitida" },
  { value: "EJECUTADA", label: "Ejecutada" },
];

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

export function formatNumero(n: number, decimales = 0): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: decimales,
    minimumFractionDigits: decimales,
  }).format(n);
}

export function formatHa(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatPctFraccion(fraccion: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(fraccion);
}

export function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}
