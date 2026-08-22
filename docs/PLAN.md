# Raíz Tech — plan de implementación (caso Papasud)

Documento de trabajo. Define el posicionamiento, el estado actual verificado, el orden de
los pasos y el contrato de cada uno. Se avanza de arriba hacia abajo: **cada paso deja el
sistema demostrable**, así que frenar en cualquier punto sigue dejando algo presentable.

---

## Posicionamiento

No es "el sistema de Papasud". **Raíz Tech** es una **plataforma de gestión para empresas
agronómicas, especializada en el cultivo de papa y tubérculos**, que se valida contra un
caso real de 140 años de operación.

Las tres piezas del pitch:

1. **Una sola verdad para toda la cadena.** De la hectárea sembrada al remito de
   exportación: parcela → orden de trabajo → cosecha → lote → movimiento → stock → cliente.
   Nada se guarda si se puede derivar.
2. **Especializada, no genérica.** El dominio de la papa está modelado de verdad: lotes por
   ubicación, variedades, calibres, categorías comerciales, grados de semilla, DTV.
   Un ERP genérico no sabe qué es "sin chicas" ni por qué el lote 221 de Santa Ana no es el
   lote 221 de Trevelín.
3. **Pensada para el campo, donde no hay señal.** El ingeniero carga en el lote y la
   información se sincroniza cuando vuelve a tener conexión. Es la diferencia entre un
   sistema que se usa y uno que se completa a la noche de memoria.

El caso Papasud aporta los datos reales: 4 ubicaciones, ~150 lotes, ~200 ha, 7.500 t de
semilla por ciclo, 25-30% exportación.

> **Sin IA.** El PDF de bases la nombra en cada nivel, pero el organizador confirmó que
> ese documento es una guía y que la consigna real es resolver el problema de negocio.
> Los campos `Movement.rawInput`, `Movement.parseadoPorIa` y `Discrepancia.hipotesis`
> quedan en su default: son previsiones a futuro, no deuda.

> **Vistas sin backend son válidas.** Una funcionalidad puede entregarse como vista
> navegable con datos de ejemplo, sin persistencia. Se marca como tal en este documento y
> los datos viven en `lib/mocks/`, nunca mezclados con `lib/actions.ts`. Regla dura: **lo
> que se muestra como dato real tiene que serlo.** El stock y las discrepancias salen de la
> base; una vista de preview no puede aparentar consultar algo que no consulta.

---

## Estado actual (verificado el 22/08/2026)

`npx tsc --noEmit` limpio. `npx tsx prisma/seed.ts` corre: `{ locs: 12, movs: 234, items: 331 }`.

| Pieza | Estado |
|---|---|
| `prisma/schema.prisma` | Migrado. Incluye `StockCount` y `ExportDoc` (todavía sin usar) |
| `lib/stock.ts` | Completo. Una query, acumulación en `Map`, sin N+1 |
| `lib/actions.ts` | Las 5 funciones implementadas, firmas respetadas |
| `prisma/seed.ts` | 234 movimientos coherentes + 2 discrepancias plantadas |
| `app/page.tsx` + `app/components/*` | Dashboard: grilla, discrepancias, form, tabla |

Patrón a **preservar**: `calcularStockMap()` (con negativos, para validar) separado de
`calcularStock()` (solo positivos, para mostrar); `registrarMovimiento` descontando
acumulativamente para validar dos líneas del mismo lote en un remito; server component +
`Suspense` + skeleton con el formulario aislado como client.

### Deuda detectada

1. **El panel de discrepancias es 95% ruido.** Corriendo la action: 37 filas, **35 de
   `Campo`**, solo 2 reales. `Campo` quedó `esPropia: true` en el seed; es origen de todos
   los ingresos y nunca destino, así que cada lote queda negativo y la función marca
   cualquier negativo.
2. **`StockCount` no se siembra ni se consulta.** `detectarDiscrepancias()` invierte la
   semántica: `esperadoKg: 0` (inventado) y `contadoKg: fila.kg` (que es el esperado). La
   UI dice "coincide con el último conteo" hablando de un conteo que no existe. Es la única
   parte del sistema que afirma algo falso.
3. **Hardcode defensivo.** `UBICACIONES_PROPIAS` en `app/components/format.ts` lista 4
   nombres fijos con matching difuso por `includes`. Es un parche sobre (1).
4. **`MovementForm` es de una sola línea**, mientras el modelo, el seed (~30% multilínea) y
   el negocio real son multilínea.

---

## Ejecución en ventana corta

Los pasos 0 a 7 son el plan completo. **No entran todos en una ventana de menos de una
hora.** Este es el recorte, en tres carriles paralelos sin solapamiento de archivos:

| Carril | Alcance | Backend | Archivos que toca (exclusivos) |
|---|---|---|---|
| **A** | Paso 0 — gate de discrepancias | Real | `prisma/seed.ts`, `lib/actions.ts`, `app/components/format.ts`, `StockGrid.tsx`, `DiscrepanciesPanel.tsx` |
| **B** | Pasos 2 y 5 — órdenes e indicadores | Mock | `lib/mocks/*`, `app/ordenes/*`, `app/indicadores/*`, `WorkOrdersTable.tsx`, `IndicadoresTable.tsx` |
| **C** | Paso 3 — modo campo | Mock | `app/offline/*`, `OfflineBanner.tsx`, `OfflineQueue.tsx` |
| **Yo** | Nav, branding, coordinación | — | `app/layout.tsx`, `app/globals.css`, `docs/PLAN.md` |

**Ningún carril toca `app/globals.css` ni `app/layout.tsx`.** Los tokens de color ya
existen y alcanzan: `bg`, `surface`, `ink`, `muted`, `accent`, `accent-strong`,
`accent-hover`, `border`, `danger`, `danger-bg`, `ok`, `ok-bg`. Ningún carril corre
migraciones.

**Queda afuera de la ventana corta:** paso 1 (`Parcela` real), paso 4 (roles con sesión),
paso 6 (`parcelas/[id]`), paso 7 (muestreos). El carril B los aparenta con datos de ejemplo
tomados de los Excel reales; la migración se hace después.

---

## Paso 0 — Gate: que la demo no mienta

**Bloqueante.** Agregar pantallas encima de un panel con 35 falsos positivos empeora la
demo en lugar de mejorarla.

- [ ] `prisma/seed.ts:290` — `Campo` pasa a `esPropia: false`.
- [ ] `prisma/seed.ts` — sembrar ~10 filas de `StockCount` calculadas contra el stock
      derivado: 8 coincidentes, 1 con faltante, 1 con sobrante. Agregar
      `stockCount.deleteMany()` al bloque de limpieza idempotente.
- [ ] `lib/actions.ts` — `detectarDiscrepancias()` cruza el derivado contra el último
      `StockCount` por `(locationId, variedad, lote)`. `esperadoKg` = derivado,
      `contadoKg` = conteo físico, `diffKg = contado - esperado`. Solo ubicaciones propias,
      solo donde hay conteo, solo donde la diferencia supera 0.5 kg.
- [ ] `app/components/format.ts` — borrar `UBICACIONES_PROPIAS` y `findStockForLocation`;
      `StockGrid` mapea sobre lo que devuelve `getStock()`.

**Done cuando:** `getStock()` devuelve 4 ubicaciones sin nombres hardcodeados y
`detectarDiscrepancias()` devuelve exactamente 2 filas con esperado y contado reales.

---

## Paso 1 — `Parcela` y `Campania`: el eslabón que falta

**En solitario, sin agentes en paralelo.** Todo lo demás depende de esta migración.

Hay **dos conceptos de "lote"** y el modelo solo tiene uno: el de partida/depósito (221,
240, 810) que ya está como `MovementItem.lote`, y el de **parcela de campo** (37A, 41, o
"Pivote B / Tercio 2") con **superficie en hectáreas**, que no existe. Sin él, el
rendimiento (kg/ha) no es calculable y las órdenes de trabajo no tienen a qué colgarse.

Evidencia cruzada en tres fuentes independientes:

| Fuente | Evidencia |
|---|---|
| `Planilla de movimientos 2026.xls`, hoja `Stocks` | `Agata / 37A / 13 ha`, `Atlantic / 41 / 14.3 ha`, con Prod. Total, Exp, % Exp |
| `Muestras pre-cosecha Oriente 2020.xlsx` | hojas `Ag L37-2021`, `At L41-2021` |
| `Orden de trabajo.xlsx`, hoja `Orden` | `Pivote B / Tercio 2 / 13.5 ha` |

```
Campania(id, nombre "2026", desde, hasta)
Parcela(id, codigo "37A", pivote?, tercio?, superficieHa, variedad, campaniaId)
Movement.parcelaId String?   // NULLABLE - solo en ingresos desde campo
```

`parcelaId` nullable a propósito: los 234 movimientos existentes siguen funcionando y el
seed hace backfill solo en `INGRESO_TOLVAS`, `INGRESO_TREVELIN` y `CAMPO_A_FRIO`.

- [ ] Migración + `prisma generate`.
- [ ] Seed: ~12 parcelas con superficies reales de la hoja `Stocks`.
- [ ] Seed: backfill de `parcelaId` respetando la variedad.

**Done cuando:** kg ingresados por parcela / superficie da un rendimiento plausible
(referencia del Excel: ~1.150 bolsas/ha en el ensayo `Ax Rootex`).

---

## Paso 2 — Órdenes de trabajo

**Problema del PDF:** *"se arman de forma manual, muchas veces después de haber estado todo
el día en el campo. Es un proceso lento, propenso a errores, y sin conexión directa con
ningún sistema central."*

### El asset ya existe

`Orden de trabajo.xlsx`, hoja **`Presupuesto`**: 89 filas de catálogo de agroquímicos
(Herbicidas / Insecticidas / Fungicidas) con marca, principio activo, **U$S por unidad**,
dosis/ha y curaciones por ciclo. Es el "diccionario de insumos y dosis recomendadas" que el
PDF prometía, **y además trae precios**.

Hoja **`Orden`**, con forma cabecera + líneas:

```
Orden de Trabajo / Aplicación   N 1    emitida 10/11/2026
Fecha tarea: 11/11/2026  07:30      Aplicador: Daniel
---------------------------------------------------------------
Marca        Principio activo   Dosis/ha Pivote Tercio Sup.  Total Uso  Herramienta
Dithane N80  Mancozeb             2.5      B      2    13.5    33.75      Drone
Engeo        Tiametoxam+Lambda    0.25     B      2    13.5     3.375     Drone
```

Cuatro observaciones que bajan el costo:

1. **Es el mismo patrón que `Movement` + `MovementItem`.** No es un módulo nuevo, es el
   mismo molde.
2. **Dos fechas distintas: emisión y tarea.** Las horas son 07:30, 21:15, 06:00 -
   aplicaciones de madrugada y de noche, cuando no hay viento. Ese gap emisión-ejecución
   *es* el problema del PDF. Mostrarlo en la UI demuestra que se entendió.
3. `Total Uso = Dosis/ha × Superficie` → derivado, no se guarda.
4. `Herramienta` es un enum chico: Drone / Pulverizadora.

```
Insumo(id, marca, principioActivo, categoria, precioUsd, dosisHaRecomendada, unidad)
WorkOrder(id, numero, fechaEmision, fechaTarea, aplicador, herramienta, estado)
WorkOrderLinea(id, workOrderId, insumoId, parcelaId, dosisHa)
```

- [ ] **Versión mock (ventana corta):** `lib/mocks/campo.ts` con insumos y órdenes reales
      del Excel + `app/ordenes/page.tsx` (listado con costo en USD calculado).
- [ ] **Versión real:** `lib/campo.ts` (derivación de uso y costo, calca `lib/stock.ts`),
      `lib/actions/campo.ts`, `WorkOrderForm.tsx` **multilínea desde el arranque**.

**Aviso de datos:** las órdenes del Excel están fechadas en **noviembre 2026** y los
movimientos van de **febrero a julio 2026**. Son ciclos distintos: normalizar a una misma
campaña o quedan órdenes sin cosecha asociada.

---

## Paso 3 — Modo campo: carga sin conexión

**El diferencial del pitch.** El ingeniero está en el lote sin señal, carga la orden de
trabajo o el movimiento, y queda en una cola local que se sincroniza al recuperar conexión.
Es lo que separa un sistema que se usa en el campo de uno que se completa a la noche de
memoria, que es exactamente el problema que describe el PDF.

**Versión de esta ventana: vista sin backend.** Sin service worker, sin IndexedDB, sin
sincronización real.

- [ ] `app/offline/page.tsx` — cola de registros pendientes: qué se cargó, cuándo, desde
      qué parcela, y el estado (`pendiente` / `sincronizado`). Datos en estado local del
      componente.
- [ ] `app/components/OfflineBanner.tsx` — indicador de estado de conexión con el conteo de
      pendientes. Puede leer `navigator.onLine` (una línea, real y honesta).
- [ ] Botón "Sincronizar" que mueve los pendientes a sincronizados **en estado local**, con
      una transición visible. Sin llamada a la base.

**Regla de honestidad:** la vista no debe afirmar que persistió nada en el servidor. El
copy correcto es "3 registros esperando conexión", no "3 registros guardados".

**Camino real a futuro (no ahora):** service worker + IndexedDB como cola, replay contra
`registrarMovimiento` al reconectar, y resolución de conflictos por remito. El modelo ya lo
soporta: los movimientos son inmutables y el stock es derivado, así que reproducir una cola
en orden da el mismo resultado.

---

## Paso 4 — Roles

Enum `Role` en `User`, chequeo en las server actions, nav filtrado. **Nada de OAuth ni
NextAuth**: login por email con cookie httpOnly, o un selector de usuario si apremia.

| Rol | Ve | Puede |
|---|---|---|
| **Ingeniero** | Sus parcelas, órdenes, rendimiento | Crear y cerrar órdenes, cargar insumos |
| **Administrativo** | Stock, movimientos, remitos, conteos | Registrar movimientos, cargar conteo físico |
| **Dueño** | Todo, read-only | Ver indicadores, discrepancias, aprobar excepciones |

El rol de dueño rinde mucho con poco código: es una vista de solo lectura sobre datos ya
calculados. Lo que lo vende es que **ve el costo de insumos de una parcela al lado de la
producción de esa misma parcela**.

- [ ] Migración `User` + `Role` + seed con 3 usuarios.
- [ ] Sesión por cookie httpOnly + `getUsuarioActual()`.
- [ ] Guard en las actions de escritura + nav filtrado en `app/layout.tsx`.

---

## Paso 5 — Indicadores

**Problema del PDF:** *"más de 20 años de datos vive en un archivo de Excel... difícil de
consultar, no está protegida contra errores humanos, y no genera ningún tipo de proyección
a futuro."*

**Consultar es filtrar, no preguntar.** Todo derivado, cero tablas de métricas:

```
producción(parcela)  = kg de movimientos de ingreso con esa parcelaId
rendimiento(parcela) = producción / parcela.superficieHa
% exportación        = kg con categoria EXPORTACION / producción
costo/ha             = costo de órdenes de esa parcela / superficieHa
```

- [ ] **Versión mock:** `app/indicadores/page.tsx` con datos de `lib/mocks/campo.ts`.
- [ ] **Versión real:** `lib/indicadores.ts` + `lib/actions/indicadores.ts`, filtros por
      campaña, variedad y parcela.

**Punto a decir en la demo:** el problema de "planilla frágil editada por varias personas
sin validaciones" ya está resuelto por el hecho de que ahora es Postgres con constraints y
una regla que impide sacar más de lo que hay. Es el 80% del valor de esta vertical y es
**invisible** si no se cuenta.

---

## Paso 6 — `parcelas/[id]`: la pantalla que une todo

```
Parcela 37A - agata - 13 ha - campaña 2026
-----------------------------------------------------------
Órdenes de trabajo   4 aplicaciones - U$S 1.240 - U$S 95/ha    <- paso 2
Proyección           muestreo 22-12: 87% exportación           <- paso 7
Producción real      11.900 kg - 915 kg/ha - 84% exportación   <- stock
Trazabilidad         lotes 224, 240 -> Dospanca -> Parmentier  <- stock
```

Ningún equipo que resuelva una sola vertical puede armar esta pantalla: necesita las
órdenes **y** los movimientos colgando de la misma entidad.

- [ ] Server component que compone `lib/campo.ts`, `lib/indicadores.ts` y `lib/stock.ts`.
      Sin lógica nueva.

---

## Paso 7 — Muestreos pre-cosecha (opcional)

Resuelve la "proyección a futuro" de la V1 **sin ningún modelo**: es una regla de tres. La
muestra da kg por planta y plantas por metro; la superficie da el total; el % por calibre da
el reparto entre exportación, sin chicas y semilla. Con exportación al 25-30% del negocio,
"cuántos kg de exportación voy a tener" es *la* pregunta antes de cosechar.

```
Muestreo(id, parcelaId, fecha, tratamiento?, pesoTotalKg, nTuberculos, tallos?)
MuestreoCalibre(id, muestreoId, rango "40-55", pesoKg, cantidad)
```

Datos reales en `Muestras pre-cosecha Oriente 2020.xlsx`: distribución por calibre
(>60, 55-60, 40-55, 30-40, <30 mm), ensayos con y sin Rootex, `Rto/Ha` por categoría.
El remate: **proyectado vs real por parcela**.

---

## Convenciones

```
lib/<dominio>.ts   -> cálculo derivado, puro, una o dos queries, sin N+1
lib/actions/*.ts   -> server actions con firmas explícitas
lib/mocks/*.ts     -> datos de ejemplo para vistas sin backend, NUNCA mezclados con actions
lib/types.ts       -> DTOs compartidos
app/components/*   -> presentación tonta, recibe DTOs
prisma/seed.ts     -> ledger en memoria para garantizar coherencia causal
```

- **Nada se guarda si se puede derivar.** Si aparece la tentación de una tabla de métricas,
  falta un `lib/<dominio>.ts`.
- **Un mock nunca pretende ser real.** Vive en `lib/mocks/`, y la UI no afirma haber
  consultado ni persistido nada.
- **Partir los archivos que crecen.** `lib/actions.ts` son 251 líneas; con tres verticales
  llega a 700. Partir en `lib/actions/{stock,campo,indicadores}.ts` con un `index.ts` que
  reexporte, así los imports actuales no se rompen.
- **Re-declarar los contratos por vertical.** El `FIRMAS CONGELADAS` de `lib/actions.ts`
  sirvió para tres agentes en paralelo y cumplió. Un contrato que no cubre un caso se
  convierte en un workaround, como pasó con `UBICACIONES_PROPIAS`.
- **Propiedad exclusiva de archivos por carril.** Ningún agente toca `globals.css` ni
  `layout.tsx`. Ver la tabla de "Ejecución en ventana corta".
- **Sin em-dash en texto visible de la UI**, sin gradient-text, sin glassmorphism.

---

## Pendientes de dominio

- [ ] ¿`37A` (hoja Stocks) es lo mismo que `Pivote B / Tercio 2` (hoja Orden)? Las
      superficies (13 y 13.5 ha) son sospechosamente parecidas. Si es lo mismo, es **una**
      tabla `Parcela`. Barata de preguntar, cara de equivocar.
- [ ] El archivo de muestras dice "**Oriente** 2020" y la hoja `Stocks` dice
      "**Santa Ana - Marisol**": hay al menos dos establecimientos.
- [ ] `MovementForm` multilínea: el modelo y el negocio lo son, la UI todavía no.
