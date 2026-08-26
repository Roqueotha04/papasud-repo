"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartBar,
  ChatCircleDots,
  ClipboardText,
  Flask,
  Gauge,
  MapPinLine,
  Plant,
  Scales,
  SignOut,
  TrendUp,
  Truck,
  Warehouse,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { logout } from "@/lib/actions";
import type { UsuarioDTO } from "@/lib/types";

type Link = { href: string; label: string; icon: Icon };
type Grupo = { titulo: string; links: Link[]; roles?: UsuarioDTO["rol"][] };

const ROL_LABEL: Record<UsuarioDTO["rol"], string> = {
  INGENIERO: "Ingeniero",
  ADMINISTRATIVO: "Administrativo",
  DUENO: "Dueño",
};

// Agrupadas por el momento del negocio. El dashboard va suelto arriba de todo:
// es la entrada al sistema y la ve cualquier rol. `roles` filtra el grupo entero.
const GRUPOS: Grupo[] = [
  {
    titulo: "Inicio",
    links: [{ href: "/", label: "Resumen", icon: Gauge }],
  },
  {
    titulo: "Depósito",
    roles: ["ADMINISTRATIVO", "DUENO"],
    links: [
      { href: "/stock", label: "Stock", icon: Warehouse },
      { href: "/movimientos", label: "Movimientos", icon: Truck },
      { href: "/discrepancias", label: "Discrepancias", icon: Scales },
    ],
  },
  {
    titulo: "Campo",
    roles: ["INGENIERO", "DUENO"],
    links: [
      { href: "/parcelas", label: "Parcelas", icon: Plant },
      { href: "/ordenes", label: "Órdenes de trabajo", icon: ClipboardText },
      { href: "/muestreos", label: "Muestreos", icon: Flask },
      { href: "/muestreos/proyeccion", label: "Proyección", icon: TrendUp },
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

function coincide(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Gana el match más largo: con /muestreos y /muestreos/proyeccion en el nav,
// estar en la proyección tiene que encender un solo link, no los dos.
function hrefActivo(pathname: string, grupos: Grupo[]): string | undefined {
  return grupos
    .flatMap((g) => g.links)
    .map((l) => l.href)
    .filter((href) => coincide(pathname, href))
    .sort((a, b) => b.length - a.length)[0];
}

export function Sidebar({ usuario }: { usuario: UsuarioDTO | null }) {
  const pathname = usePathname() ?? "/";

  if (!usuario) return null;

  const grupos = GRUPOS.filter(
    (grupo) => !grupo.roles || grupo.roles.includes(usuario.rol),
  );
  const activo = hrefActivo(pathname, grupos);

  return (
    <aside className="flex flex-col border-b border-border bg-surface md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2.5 px-4 py-4 md:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg">
          <Image
            src="/papasud-logo.webp"
            alt=""
            width={32}
            height={32}
            className="shrink-0 rounded-md"
            priority
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-base font-semibold tracking-tight text-ink">
              Papasud Tech
            </span>
            <span className="truncate text-xs text-muted">Gestión agronómica</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Secciones" className="flex-1 overflow-y-auto px-2 pb-3 md:px-3 md:pb-6">
        {/* En móvil los grupos se aplanan en una tira horizontal scrolleable;
            en desktop se apilan con su encabezado. */}
        <ul className="flex gap-1 overflow-x-auto md:block md:space-y-5 md:overflow-visible">
          {grupos.map((grupo) => (
            <li key={grupo.titulo} className="contents md:block">
              <p className="hidden px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted md:block">
                {grupo.titulo}
              </p>
              <ul className="contents md:block md:space-y-0.5">
                {grupo.links.map((link) => {
                  const active = link.href === activo;
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

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 md:px-5">
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium text-ink">
            {usuario.nombre}
          </span>
          <span className="block truncate text-xs text-muted">
            {ROL_LABEL[usuario.rol]}
          </span>
        </span>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-muted transition-colors hover:bg-bg hover:text-ink"
          >
            <SignOut size={18} aria-hidden />
          </button>
        </form>
      </div>
    </aside>
  );
}
