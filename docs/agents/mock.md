# Agente MOCK — Generación de datos de prueba

Sos el agente responsable **exclusivamente** de crear datos mock coherentes en la base de datos. No toques frontend ni backend.

## Contexto mínimo

Papasud mueve papa entre ubicaciones (campo → planta → frío → cliente). Todo se modela como **movimientos**: cada remito traslada mercadería de un origen a un destino. El stock NO se guarda: se deriva de los movimientos. Detalle del negocio en `docs/NEGOCIO.md`.

## Tu archivo (lo único que editás)

- `prisma/seed.ts` (lo creás)
- `package.json` — solo para agregar el script `"db:seed": "tsx prisma/seed.ts"`

**Prohibido:** tocar `lib/**`, `app/**`, `prisma/schema.prisma`, `prisma/migrations/**`. El schema está congelado.

## Modelo con el que trabajás (ya migrado)

```
Location(id, nombre[unique], tipo: LocationType, esPropia: bool)
Movement(id, remito?, fecha, tipo: MovementType, transporte?, cliente?,
         comisionista?, dtv?, observaciones?, origenId, destinoId, items[])
MovementItem(id, movementId, variedad, lote, categoria?: Categoria,
             unidad: Unidad, bolsas?, kg, kgPromedio?, colorBolsa?, colorHilo?,
             gradoSemilla?: GradoSemilla)
```

Enums:
- `LocationType`: CAMPO, PLANTA, GALPON, FRIGORIFICO, CLIENTE
- `MovementType`: CAMPO_A_FRIO, INGRESO_TOLVAS, ENVIO_A_FRIO, RETORNO_FRIO, PAPA_CHICA, INGRESO_TREVELIN, ENTREGA_CLIENTE
- `Categoria`: EXPORTACION, SIN_CHICAS, RECIBO, GRANEL, DESCARTE_PARAGUAY, SOLO_CHASIS, SEMILLA
- `Unidad`: BOLSA, GRANEL, GRANEL_CHASIS, GRANEL_ACOPLADO
- `GradoSemilla`: INICIAL_1, INICIAL_2, INICIAL_3

## Catálogos a sembrar (nombres reales del negocio)

**Ubicaciones propias (`esPropia: true`):**
- `Campo` (CAMPO), `Santa Ana` (PLANTA), `Galpón` (GALPON), `Dospanca` (FRIGORIFICO), `Trevelín` (PLANTA)

**Ubicaciones externas (`esPropia: false`):**
- Frigoríficos: `Frigopap`, `Sasula`, `Cecive` (FRIGORIFICO)
- Clientes: `Parmentier`, `McCain-Wemar`, `La Unión del Sur`, `Agro Selmi` (CLIENTE)

**Variedades:** agata, spunta, asterix, atlantic, daifla, king russet, memphis, sunred, ludmilla, kennebec.

**Transportes:** Serantes-Vera, Camillo (Gastón), Camillo (Mario), Arenas (Jaimez), Arenas (De Grandis), Cerone (Raphael), Cerone (Sotelo), Álvaro Arenas.

**Rangos de lote por ubicación** (el lote NO es global): Santa Ana usa 220–360 y 500–900; Trevelín usa 2–20. Mantené esa distinción.

## Regla de oro: coherencia física

**Ninguna salida puede sacar más kg de los que entraron** a ese `ubicación + variedad + lote`. Para lograrlo, llevá un **acumulador en memoria** del stock por `(ubicaciónId, variedad, lote)` y generá los movimientos en **orden causal**:

1. **Ingresos primero** (`INGRESO_TOLVAS` a Santa Ana, `INGRESO_TREVELIN` a Trevelín, `CAMPO_A_FRIO` a Dospanca/Galpón). Suman stock en el destino.
2. **Movimientos internos** (`ENVIO_A_FRIO` de Santa Ana → frigorífico, `RETORNO_FRIO` de vuelta al galpón). Restan del origen, suman al destino, siempre ≤ disponible.
3. **Salidas al final** (`ENTREGA_CLIENTE`, `PAPA_CHICA`). Restan del origen, ≤ disponible.

Cada movimiento actualiza el acumulador. Si una salida no tiene stock suficiente, reducí la cantidad o saltala.

## Detalles realistas

- **Fechas** escalonadas entre feb y jul 2026 (respetando el orden causal: un envío no puede ser anterior a su ingreso).
- **Remitos con varias líneas**: ~30% de los movimientos con 2–3 `MovementItem` (variedades/lotes distintos).
- **kg** por línea entre 5.000 y 43.000; **bolsas** = round(kg / kgPromedio); **kgPromedio** entre 48 y 54.
- **categoria** coherente con el tipo (ej. `ENVIO_A_FRIO` suele `EXPORTACION`/`SIN_CHICAS`; `INGRESO_TOLVAS` suele `GRANEL` con `unidad` GRANEL/GRANEL_CHASIS).
- **Trevelín** = semilla: seteá `gradoSemilla` (INICIAL_1/2/3), `colorBolsa`/`colorHilo`.
- **DTV** tipo `"1334xxxx-x"` en algunos movimientos.

## Discrepancias plantadas (para el dashboard)

Generá **2 casos a propósito** para que el backend/dashboard tengan algo que mostrar:
- Una **salida sin el ingreso espejo** en destino (sale de origen, el destino nunca lo registra).
- Un **movimiento con kg claramente desbalanceado** respecto de su lote.
Dejá una `observaciones` que insinúe la causa (ej. `"posible falta de registro en destino"`).

## Volumen objetivo

**~150–250 movimientos** en total. Suficiente para una demo creíble sin volверse lento.

## Buenas prácticas (Postgres/Prisma)

- Insertá en **lotes** con `createMany` cuando puedas; para movimiento + items usá `prisma.movement.create({ data: { ...mov, items: { create: [...] } } })`.
- Envolvé la siembra en pocas transacciones grandes, no una por fila.
- **Idempotencia**: al inicio, limpiá en orden hijo→padre: `movementItem.deleteMany()` → `movement.deleteMany()` → `location.deleteMany()`. Así el seed se puede correr N veces.

## Esqueleto de `prisma/seed.ts`

```ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.movementItem.deleteMany();
  await prisma.movement.deleteMany();
  await prisma.location.deleteMany();

  // 1) locations -> guardá los ids en un Map<nombre, id>
  // 2) acumulador: Map<`${locId}|${variedad}|${lote}`, kg>
  // 3) generá ingresos, internos y salidas respetando el acumulador
  //    creando cada Movement con sus items anidados.
  // 4) plantá las 2 discrepancias.

  const [locs, movs, items] = await Promise.all([
    prisma.location.count(),
    prisma.movement.count(),
    prisma.movementItem.count(),
  ]);
  console.log({ locs, movs, items });
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
```

> Importá enums como valores desde `../app/generated/prisma/enums` o usá los strings del enum directamente (Prisma los acepta).

## Cómo ejecutar y verificar (Done)

1. `npx tsx prisma/seed.ts`
2. Confirmá que imprime conteos: locations = 9, movements ≈ 150–250, items ≥ movements.
3. La consola no debe tirar errores de foreign key ni de conexión.

## Opcional / a futuro (no es requisito ahora)

- Campo `parseadoPorIa` / `rawInput`: dejalos en su default; los usará una capa de IA más adelante para registrar movimientos por texto/voz. No hace falta poblarlos.
