"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  ChartBar,
  ChatCircleDots,
  ClipboardText,
  Flask,
  Gauge,
  List,
  MapPinLine,
  Plant,
  Scales,
  SignOut,
  TrendUp,
  Truck,
  Warehouse,
  X,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { logout } from "@/lib/actions";
import type { UsuarioDTO } from "@/lib/types";

type Enlace = { href: string; label: string; icon: Icon };
type Grupo = { titulo: string; links: Enlace[]; roles?: UsuarioDTO["rol"][] };

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

function Marca() {
  return (
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
  );
}

function NavLista({
  grupos,
  activo,
  onNavigate,
}: {
  grupos: Grupo[];
  activo: string | undefined;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-5">
      {grupos.map((grupo) => (
        <li key={grupo.titulo}>
          <p className="px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            {grupo.titulo}
          </p>
          <ul className="space-y-0.5">
            {grupo.links.map((link) => {
              const active = link.href === activo;
              const Ico = link.icon;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function PieUsuario({ usuario }: { usuario: UsuarioDTO }) {
  return (
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
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-bg hover:text-ink"
        >
          <SignOut size={18} aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function Sidebar({ usuario }: { usuario: UsuarioDTO | null }) {
  const pathname = usePathname() ?? "/";
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const abierto = abiertoEn === pathname;
  const panelId = useId();
  const abrirRef = useRef<HTMLButtonElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const estabaAbierto = useRef(false);

  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbiertoEn(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = "hidden";
      cerrarRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      if (estabaAbierto.current) abrirRef.current?.focus();
    }
    estabaAbierto.current = abierto;
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  if (!usuario) return null;

  const grupos = GRUPOS.filter(
    (grupo) => !grupo.roles || grupo.roles.includes(usuario.rol),
  );
  const activo = hrefActivo(pathname, grupos);

  function abrir() {
    setAbiertoEn(pathname);
  }

  function cerrar() {
    setAbiertoEn(null);
  }

  return (
    <>
      <header className="sticky top-0 z-sticky flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] md:hidden">
        <Marca />
        <button
          ref={abrirRef}
          type="button"
          aria-expanded={abierto}
          aria-controls={panelId}
          aria-label="Abrir menú"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-bg"
          onClick={abrir}
        >
          <List size={22} aria-hidden />
        </button>
      </header>

      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <Marca />
        </div>
        <nav aria-label="Secciones" className="flex-1 overflow-y-auto px-3 pb-6">
          <NavLista grupos={grupos} activo={activo} />
        </nav>
        <PieUsuario usuario={usuario} />
      </aside>

      <div
        className={`fixed inset-0 z-overlay md:hidden ${
          abierto ? "" : "pointer-events-none"
        }`}
        inert={!abierto ? true : undefined}
      >
        <div
          aria-hidden
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 ${
            abierto ? "opacity-100" : "opacity-0"
          }`}
          onClick={cerrar}
        />
        <aside
          id={panelId}
          aria-label="Menú"
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[calc(100%-2.5rem)] flex-col border-r border-border bg-surface shadow-card transition-transform duration-200 ease-out ${
            abierto ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Marca />
            <button
              ref={cerrarRef}
              type="button"
              aria-label="Cerrar menú"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-bg"
              onClick={cerrar}
            >
              <X size={22} aria-hidden />
            </button>
          </div>
          <nav aria-label="Secciones" className="flex-1 overflow-y-auto px-3 pb-4">
            <NavLista grupos={grupos} activo={activo} onNavigate={cerrar} />
          </nav>
          <PieUsuario usuario={usuario} />
        </aside>
      </div>
    </>
  );
}
