import { DownloadSimple } from "@phosphor-icons/react/ssr";

/** Link de descarga a /api/export/[tipo], mismo estilo en todas las páginas
 *  que lo ofrecen. `query` se reenvía tal cual para que el archivo respete
 *  los filtros que el usuario ya tiene aplicados en la vista. */
export function ExportLink({
  tipo,
  query,
}: {
  tipo: "stock" | "movimientos" | "indicadores" | "muestreos";
  query?: string;
}) {
  const href = `/api/export/${tipo}${query ? `?${query}` : ""}`;
  return (
    <a
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-accent/10"
    >
      <DownloadSimple size={16} aria-hidden />
      Exportar a Excel
    </a>
  );
}
