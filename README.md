# Raíz Tech — Papasud

Plataforma de gestión para empresas agronómicas especializada en el cultivo de papa y
tubérculos. Traza la cadena completa: parcela → orden de trabajo → cosecha → lote →
movimiento → stock → cliente. El stock, las discrepancias y los indicadores se derivan de
los movimientos y las órdenes cargadas; nada se guarda si se puede calcular.

El caso de uso real detrás de la app está documentado en [`docs/NEGOCIO.md`](docs/NEGOCIO.md)
(cómo se mueve la mercadería, ubicaciones, variedades, lotes) y el estado de avance en
[`docs/PLAN.md`](docs/PLAN.md).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript.
- [Prisma 7](https://www.prisma.io) sobre PostgreSQL, con el driver adapter `@prisma/adapter-pg`.
- Tailwind CSS 4.
- Autenticación propia: JWT (`jose`) en cookie `httpOnly`, sin OAuth ni NextAuth.
- Asistente de IA opcional vía la API de Anthropic (`@anthropic-ai/sdk`).
- Export a Excel (`exceljs`) para Stock, Movimientos, Indicadores y Proyección de cosecha.

> Esta versión de Next.js (16.3.2) tiene cambios de API respecto a versiones anteriores
> (por ejemplo, `middleware.ts` pasó a llamarse `proxy.ts`). Ver `AGENTS.md` antes de tocar
> código que dependa de convenciones de Next.

## Requisitos

- Node.js 20+.
- Una base PostgreSQL accesible (local o en la nube).

## Variables de entorno

Crear un archivo `.env` en la raíz (no se versiona) con:

```bash
# Conexión a Postgres.
DATABASE_URL="postgresql://usuario:password@localhost:5432/papasud?schema=public"

# Secreto para firmar el JWT de sesión. Generar uno propio, no reusar el de otro entorno:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET="..."

# Opcional: habilita la página /asistente (consultas en lenguaje natural sobre el stock).
# Sin esta variable, el resto de la app funciona igual.
ANTHROPIC_API_KEY="..."
```

## Puesta en marcha

```bash
npm install

# Aplica las migraciones a la base configurada en DATABASE_URL.
npx prisma migrate deploy

# Genera el cliente de Prisma (se regenera solo tras cada `migrate`/`generate`).
npx prisma generate

# Carga datos de ejemplo: ubicaciones, movimientos, parcelas, muestreos, órdenes
# de trabajo y 3 usuarios de prueba (uno por rol). Es idempotente: se puede
# correr de nuevo y vuelve a dejar la base en el mismo estado conocido.
npm run db:seed

npm run dev
```

La app queda en [http://localhost:3000](http://localhost:3000). La primera pantalla es el
login; no hay acceso sin sesión.

### Usuarios de prueba (los crea el seed)

| Rol | Email | Contraseña | Puede |
|---|---|---|---|
| Ingeniero | `ingeniero@papasud.com` | `Papasud2026!` | Parcelas, muestreos, órdenes de trabajo |
| Administrativo | `administrativo@papasud.com` | `Papasud2026!` | Movimientos, conteos físicos |
| Dueño | `dueno@papasud.com` | `Papasud2026!` | Todo, en modo lectura |

Cambiar estas credenciales (o los usuarios) antes de un despliegue con datos reales:
`prisma/seed.ts` es donde se generan.

## Estructura de rutas

```
/                      Resumen (métricas + acceso al asistente)
/stock                 Stock derivado por ubicación
/movimientos            Alta de movimientos + últimos registrados
/discrepancias          Conteo físico + diferencias contra el stock derivado
/parcelas, /parcelas/[id]
/ordenes, /ordenes/[id] Órdenes de trabajo (alta + detalle)
/muestreos, /muestreos/proyeccion
                        Muestreos pre-cosecha y proyección vs. producción real
/indicadores            Producción, rendimiento, exportación y costo de insumos,
                        con filtro por variedad/campaña
/offline                Modo campo (vista de demo, sin persistencia real todavía)
/asistente              Preguntas en lenguaje natural sobre el stock (requiere
                        ANTHROPIC_API_KEY)
/login                  Único punto de entrada sin sesión
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack). |
| `npm run build` | Build de producción. |
| `npm start` | Sirve el build de producción. |
| `npm run lint` | ESLint. |
| `npm run db:seed` | Corre `prisma/seed.ts` contra `DATABASE_URL`. |

## Desplegar

1. Provisionar Postgres (Neon, Supabase, Vercel Postgres o cualquier proveedor).
2. Configurar `DATABASE_URL`, `JWT_SECRET` (uno nuevo, no el de desarrollo) y, si se quiere
   el asistente, `ANTHROPIC_API_KEY` como variables de entorno del hosting.
3. Correr `npx prisma migrate deploy` contra esa base antes del primer deploy.
4. `npm run build` seguido de `npm start` (o el equivalente del proveedor elegido).

No hay Dockerfile ni pipeline de CI en este repo todavía; se agrega cuando haga falta.
