# Agente BACKEND — Lógica de negocio y consultas

Sos el agente responsable **exclusivamente** de implementar la capa de datos (server actions + cálculo de stock). No toques frontend ni el seed.

## Contexto mínimo

Papasud mueve papa entre ubicaciones como **movimientos** (remito origen→destino). El **stock se DERIVA** de los movimientos, nunca se guarda. Detalle en `docs/NEGOCIO.md`.

## Tus archivos (lo único que editás)

- `lib/actions.ts` — implementás el cuerpo de las 5 funciones (ya existen como stub).
- `lib/stock.ts` — lo creás: cálculo puro del stock.

**Prohibido:** tocar `app/**`, `prisma/**`, `lib/prisma.ts`, `lib/types.ts`. Están congelados.

## Lo que ya existe (congelado, lo usás tal cual)

`lib/prisma.ts` exporta el cliente listo:
```ts
import { prisma } from "@/lib/prisma";
```

`lib/types.ts` define los DTOs. **No cambies las firmas** de `lib/actions.ts`; el frontend depende de ellas:

```ts
getLocations(): Promise<LocationDTO[]>
getStock(): Promise<StockPorUbicacion[]>
getMovimientos(limit?): Promise<MovimientoDTO[]>
registrarMovimiento(input: MovementInput): Promise<RegistrarResult>
detectarDiscrepancias(): Promise<Discrepancia[]>
```

Tipos clave (ver `lib/types.ts` para el detalle):
- `StockPorUbicacion = { location: LocationDTO; totalKg; totalBolsas; rows: StockRow[] }`
- `StockRow = { variedad; lote; kg; bolsas }`
- `MovementInput = { tipo; fecha?; remito?; origenId; destinoId; transporte?; cliente?; comisionista?; observaciones?; rawInput?; parseadoPorIa?; items: MovementItemInput[] }`
- `RegistrarResult = { ok: true; movementId } | { ok: false; error }`
- `Discrepancia = { locationId; locationNombre; variedad; lote; esperadoKg; contadoKg; diffKg; hipotesis? }`

## Modelo (ya migrado)

```
Location(id, nombre, tipo, esPropia)
Movement(id, remito?, fecha, tipo, transporte?, cliente?, comisionista?, dtv?,
         observaciones?, origenId, destinoId, items[])
MovementItem(id, movementId, variedad, lote, categoria?, unidad, bolsas?, kg,
             kgPromedio?, ...)
```

## `lib/stock.ts` — el corazón

Función pura que deriva el stock por `ubicación + variedad + lote`:

```
stock(locId, variedad, lote) =
   Σ item.kg  de items cuyo movimiento tiene destinoId = locId   (entradas)
 − Σ item.kg  de items cuyo movimiento tiene origenId  = locId   (salidas)
```

Implementación recomendada (una sola pasada, sin N+1):

1. Traé los items con su movimiento en **una query**:
   ```ts
   const items = await prisma.movementItem.findMany({
     select: {
       variedad: true, lote: true, kg: true, bolsas: true,
       movement: { select: { origenId: true, destinoId: true } },
     },
   });
   ```
2. Recorré una vez y acumulá en un `Map<`${locId}|${variedad}|${lote}`, {kg, bolsas}>`:
   - al `destinoId`: sumá `kg` y `bolsas`.
   - al `origenId`: restá `kg` y `bolsas`.
3. Exportá algo tipo `calcularStock(): Promise<Map<...>>` o un array de filas `{ locId, variedad, lote, kg, bolsas }`. Filtrá filas con `kg <= 0` en el resultado final (ya se consumió).

> Alternativa más SQL-idiomática: dos `groupBy` (por destino y por origen) y restar. Cualquiera de las dos sirve; priorizá que sea **una o dos queries**, nunca una por ubicación.

## Implementación de `lib/actions.ts`

Todas son server actions (`"use server"` ya está en el archivo).

- **`getLocations()`**: `prisma.location.findMany({ orderBy: { nombre: "asc" } })` → mapear a `LocationDTO`.

- **`getStock()`**: usar `lib/stock.ts`, agrupar las filas por ubicación, sumar `totalKg`/`totalBolsas`, devolver solo ubicaciones **propias** (`esPropia: true`) — el dashboard N02 muestra las 4 ubicaciones propias. Ordená filas por variedad y lote.

- **`getMovimientos(limit = 50)`**: últimos movimientos por `fecha desc`, incluir `origen`/`destino` (solo `nombre`) e `items`. Mapear a `MovimientoDTO` (origen/destino como string `nombre`).

- **`registrarMovimiento(input)`**:
  1. Validar que existan `origenId` y `destinoId` y que `items` no esté vacío.
  2. Para cada item, chequear disponibilidad en el origen con `lib/stock.ts`: si alguna línea deja el stock del lote **en negativo**, devolver `{ ok: false, error: "Stock insuficiente de <variedad> lote <lote> en <origen>: disponible X kg, pedís Y kg" }`. (Excepción: los tipos de **ingreso** —`INGRESO_TOLVAS`, `INGRESO_TREVELIN`, `CAMPO_A_FRIO`— no validan origen porque entran desde el campo.)
  3. Crear en **transacción** el `Movement` con `items: { create: [...] }`.
  4. `revalidatePath("/")` para refrescar el dashboard.
  5. Devolver `{ ok: true, movementId }`.

- **`detectarDiscrepancias()`**: por ahora, detectá filas de stock **negativas o anómalas** (una salida sin ingreso espejo deja el destino sin la entrada esperada → el origen queda con stock que no cierra). Devolvé la lista de `Discrepancia` con `esperadoKg`, `contadoKg`, `diffKg`. Dejá `hipotesis` en `null` (la completará una capa de IA a futuro).

## Buenas prácticas (Postgres/Prisma)

- **Evitá N+1**: nunca hagas una query por ubicación/lote dentro de un loop. Traé todo y agregá en memoria, o usá `groupBy`.
- **Seleccioná solo lo necesario** con `select` (no traigas columnas de más).
- **Transacciones** para escrituras compuestas (`prisma.$transaction` o `create` anidado).
- El cliente Prisma es **singleton** (`lib/prisma.ts`); no instancies otro.
- Los índices ya existen en el schema (`lote`, `variedad`, `origenId`, `destinoId`, `tipo`); tus queries deben apoyarse en ellos.

## Cómo verificar (Done)

1. `npx tsc --noEmit` sin errores.
2. Con el seed corrido, un script rápido o el dashboard debe mostrar stock coherente (nada de negativos salvo las discrepancias plantadas).
3. `registrarMovimiento` rechaza una salida mayor al stock disponible y acepta una válida.

## Opcional / a futuro (no es requisito)

- `detectarDiscrepancias` podrá enriquecerse con una `hipotesis` en lenguaje natural generada por IA.
- `registrarMovimiento` recibirá `rawInput`/`parseadoPorIa` desde un parser de texto/voz. La firma ya lo contempla; no implementes IA ahora.
