# Agente FRONTEND — Dashboard de stock (Next.js)

Sos el agente responsable **exclusivamente** de la UI. No toques backend, prisma ni el seed.

## Contexto mínimo

Papasud controla stock de papa en 4 ubicaciones propias. La app tiene que mostrar el **stock unificado** y permitir **registrar movimientos**. El stock se deriva de los movimientos (lo resuelve el backend). Detalle en `docs/NEGOCIO.md`.

## Encuadre de diseño (leelo antes de codear)

**Esto es un dashboard operativo (product UI), NO una landing.** No apliques patrones de landing (hero gigante, eyebrows, marquees, secciones de marketing). El marco es el **register "product"** de la skill `.agents/skills/impeccable`: el diseño **sirve** al producto (claridad, legibilidad, densidad razonable).

**Design read:** panel operativo de logística de papa para operarios de Papasud, lenguaje **"campo claro"**: superficie off-white tintada hacia un **verde agrícola profundo** (nada de beige/cream), aireado pero informativo, numerales monoespaciados para los datos.

## Tus archivos (lo único que editás)

- `app/page.tsx` (dashboard)
- `app/layout.tsx` (solo metadata/título y contenedor)
- `app/globals.css` (tokens de tema)
- `app/components/**` (todo lo que crees)

**Prohibido:** tocar `lib/**`, `prisma/**`. Importás de `@/lib/actions` y `@/lib/types`, pero no los editás.

## Contrato que consumís (congelado)

```ts
import {
  getStock, getLocations, getMovimientos,
  registrarMovimiento, detectarDiscrepancias,
} from "@/lib/actions";
import type {
  StockPorUbicacion, MovimientoDTO, Discrepancia, MovementInput,
} from "@/lib/types";
```

- `getStock()` → `StockPorUbicacion[]` (solo las 4 ubicaciones propias). Cada una: `{ location, totalKg, totalBolsas, rows: {variedad,lote,kg,bolsas}[] }`.
- `detectarDiscrepancias()` → `Discrepancia[]` (`esperadoKg`, `contadoKg`, `diffKg`).
- `getMovimientos(limit?)` → últimos movimientos.
- `registrarMovimiento(input)` → `{ ok:true, movementId } | { ok:false, error }`.
- `getLocations()` → para poblar los selects del formulario.

> Mientras el backend no implemente, estas funciones devuelven vacío. Diseñá los **estados vacíos** igual; no asumas que siempre hay datos.

## Stack y convenciones

- **Next.js 16 App Router** (esta versión tiene cambios; ante dudas mirá `node_modules/next/dist/docs/`).
- **Server Components por defecto** para leer datos (el dashboard es server). El formulario es un **client component** (`"use client"`) aislado que llama a la server action.
- **Tailwind v4** ya configurado. Usalo.
- **Tipografía:** ya está `Geist` + `Geist Mono` en `layout.tsx`. Usá Geist para UI y **Geist Mono para todos los números** (`tabular-nums`). No agregues Inter.
- **Íconos:** si necesitás, instalá `@phosphor-icons/react` (mostrá el comando primero). No uses lucide. Nunca dibujes SVG a mano.

## Tema "campo claro" (definí en `globals.css`, en OKLCH)

Un solo tema, claro, **locked** (no invertir secciones). Paleta sugerida (ajustala con criterio, mantené 1 acento):

```css
:root {
  --bg: oklch(0.98 0.006 150);        /* off-white tintado a verde, NO beige */
  --surface: oklch(1 0 0);            /* tarjetas */
  --ink: oklch(0.24 0.02 150);        /* texto principal (contraste AA+) */
  --muted: oklch(0.5 0.02 150);       /* texto secundario, >=4.5:1 */
  --accent: oklch(0.45 0.09 150);     /* verde agrícola: acento ÚNICO */
  --border: oklch(0.9 0.01 150);
  --danger: oklch(0.5 0.15 25);       /* discrepancias / errores */
}
```

Radio de esquina único (elegí uno: ~10px) y usalo en todo. Sombras tintadas al fondo, nunca negro puro.

## Qué construir

1. **Layout / header**: nombre "Papasud · Stock" y un resumen arriba (total kg en las 4 ubicaciones, cantidad de movimientos). Números en mono.
2. **Grilla de las 4 ubicaciones** (Santa Ana, Galpón, Dospanca, Trevelín): por cada una, `totalKg` grande en mono + una tabla compacta de `lote / variedad / kg / bolsas`. Usá `grid` responsivo (`grid-cols-1 md:grid-cols-2`).
3. **Panel de discrepancias**: lista de `detectarDiscrepancias()` con esperado vs contado vs diferencia, resaltado con `--danger`. Si no hay, estado vacío positivo ("Sin discrepancias").
4. **Registrar movimiento** (formulario client): selects de `tipo`, `origen`, `destino` (de `getLocations()`), inputs `variedad`, `lote`, `kg`, `bolsas`. Al enviar, llama `registrarMovimiento`; si `ok:false`, mostrá el `error` **inline** (típico: "Stock insuficiente…"); si `ok:true`, limpiá y refrescá.
5. **Últimos movimientos**: tabla de `getMovimientos()` (fecha, tipo, origen→destino, variedad/lote, kg).

## Reglas de calidad (obligatorias)

- **Contraste WCAG AA**: texto ≥4.5:1; nada de gris claro "elegante" ilegible. Placeholders también ≥4.5:1.
- **Estados completos**: loading (skeleton con la forma real), vacío (invita a cargar un movimiento), error (inline en el form).
- **Sin tells de IA**: nada de gradient-text, glassmorphism decorativo, borde lateral de color (`border-left` grueso), eyebrows en cada sección, marcadores numerados 01/02/03, ni **em-dash** (`—`) en ningún texto visible (usá guion `-`).
- **Cards con criterio**: usá tarjeta solo donde la elevación comunica jerarquía real; agrupá con `border`/espacio cuando alcance. Nada de tarjetas anidadas.
- **Tablas de datos**: para el stock y los movimientos, tabla legible (no una landing). Números `tabular-nums` alineados a la derecha.
- **Motion**: mínima y motivada (un fade/stagger sutil al cargar listas). Respetá `prefers-reduced-motion`.
- **Responsive**: todo colapsa a 1 columna en `<768px`. Contené el ancho (`max-w-7xl mx-auto`).
- **z-index semántico**, sin `z-9999` arbitrarios.

## Cómo verificar (Done)

1. `npm run dev` levanta sin errores; `npx tsc --noEmit` limpio.
2. El dashboard renderiza las 4 ubicaciones, el panel de discrepancias y el formulario (aunque estén vacíos si el backend/seed no corrieron).
3. Cargar un movimiento inválido muestra el error inline; uno válido lo agrega y refresca el stock.
4. Revisá contraste y el layout en mobile.

## Opcional / a futuro (no es requisito)

- Entrada de movimientos por **texto/voz** con IA (parser NL → `MovementInput`). El formulario puede dejar previsto un campo de texto libre, pero **no** implementes IA ahora.
- Hipótesis en lenguaje natural en el panel de discrepancias (vendrá del backend).
