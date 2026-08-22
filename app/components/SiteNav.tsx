"use client";

import { usePathname } from "next/navigation";
import { Plant } from "@phosphor-icons/react";

const LINKS = [
  { href: "/", label: "Stock" },
  { href: "/parcelas", label: "Parcelas" },
  { href: "/ordenes", label: "Órdenes" },
  { href: "/muestreos", label: "Muestreos" },
  { href: "/indicadores", label: "Indicadores" },
  { href: "/offline", label: "Modo campo" },
  { href: "/asistente", label: "Asistente" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname() ?? "/";

  return (
    <div className="-mx-4 border-b border-border px-4 md:-mx-6 md:px-6">
      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-lg"
          aria-label="Raíz Tech, ir al inicio"
        >
          <Plant size={24} weight="fill" className="shrink-0 text-accent" aria-hidden />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-base font-semibold tracking-tight text-ink">
              Raíz Tech
            </span>
            <span className="truncate text-xs text-muted">
              Gestión agronómica para cultivos de papa
            </span>
          </span>
        </a>

        <nav aria-label="Secciones">
          <ul className="flex flex-wrap items-center gap-1">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "block rounded-lg bg-accent-strong px-3 py-1.5 text-sm font-medium text-white"
                        : "block rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
                    }
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
