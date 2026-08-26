// Nombres legibles de las herramientas del asistente, para mostrar en la UI
// qué consultó antes de responder. Vive fuera de ask.ts porque ese archivo es
// "use server" y solo puede exportar funciones async, y fuera de tools.ts
// porque ese importa Prisma y esto lo lee un componente cliente.

export const ETIQUETA_HERRAMIENTA: Record<string, string> = {
  consultar_stock: "Stock",
  consultar_movimientos: "Movimientos",
  trazar_lote: "Trazabilidad del lote",
  consultar_parcelas: "Parcelas",
  consultar_indicadores: "Indicadores",
  consultar_muestreos: "Muestreos y proyección",
  consultar_ordenes: "Órdenes de trabajo",
  consultar_discrepancias: "Discrepancias",
  consultar_catalogos: "Catálogos",
};

export function etiquetaHerramienta(nombre: string): string {
  return ETIQUETA_HERRAMIENTA[nombre] ?? nombre;
}
