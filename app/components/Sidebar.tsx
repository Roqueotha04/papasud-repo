"use client";

import { usePathname } from "next/navigation";
import {
  ChartBar,
  ChatCircleDots,
  ClipboardText,
  Flask,
  MapPinLine,
  Plant,
  Stack,
  Warehouse,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

type Link = { href: string; label: string; icon: Icon };
type Grupo = { titulo: string; links: Link[] };

// Agrupadas por el momento del negocio. El depósito va primero porque el stock
// derivado es la raíz del sistema y la ruta de inicio: es lo primero que se muestra.
const GRUPOS: Grupo[] = [
  {
    titulo: "Depósito",
    links: [{ href: "/", label: "Stock y movimientos", icon: Warehouse }],
  },
  {
    titulo: "Campo",
    links: [
      { href: "/parcelas", label: "Parcelas", icon: Plant },
      { href: "/ordenes", label: "Órdenes de trabajo", icon: ClipboardText },
      { href: "/muestreos", label: "Muestreos", icon: Flask },
    ],
  },
  {
    titulo: "Análisis",
    links: [{ href: "/indicadores", label: "Indicadores", icon: ChartBar }],
  },
  {
    titulo: "Herramientas",
    links: [
      { href: "/offline", label: "Modo campo", icon: MapPinLine },
      { href: "/asistente", label: "Asistente", icon: ChatCircleDots },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="border-b border-border bg-surface md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
      <div className="flex items-center gap-2.5 px-4 py-4 md:px-5">
        <a href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg">
          <Stack size={24} weight="fill" className="shrink-0 text-accent" aria-hidden />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-base font-semibold tracking-tight text-ink">
              Raíz Tech
            </span>
            <span className="truncate text-xs text-muted">Gestión agronómica</span>
          </span>
        </a>
      </div>

      <nav aria-label="Secciones" className="px-2 pb-3 md:px-3 md:pb-6">
        {/* En móvil los grupos se aplanan en una tira horizontal scrolleable;
            en desktop se apilan con su encabezado. */}
        <ul className="flex gap-1 overflow-x-auto md:block md:space-y-5 md:overflow-visible">
          {GRUPOS.map((grupo) => (
            <li key={grupo.titulo} className="contents md:block">
              <p className="hidden px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted md:block">
                {grupo.titulo}
              </p>
              <ul className="contents md:block md:space-y-0.5">
                {grupo.links.map((link) => {
                  const active = isActive(pathname, link.href);
                  const Ico = link.icon;
                  return (
                    <li key={link.href} className="shrink-0">
                      <a
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-accent-strong text-white"
                            : "text-muted hover:bg-bg hover:text-ink"
                        }`}
                      >
                        <Ico
                          size={18}
                          weight={active ? "fill" : "regular"}
                          className="shrink-0"
                          aria-hidden
                        />
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
