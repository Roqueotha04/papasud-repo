# Papasud — Cómo funciona el negocio

Papasud es una operación agrícola de **papa**: siembra, cosecha, acondicionamiento en frío/depósito y venta o exportación. La producción es propia y se mueve entre varias **ubicaciones** físicas. Toda la operación se traza como **movimientos de mercadería**: cada movimiento traslada papa de un origen a un destino, identificado por un **remito**.

## Flujo físico de la mercadería

La papa nace en el **campo** (chacras divididas en lotes) y avanza por la cadena hasta el cliente:

```
CAMPO (chacras / lotes)
   ├─ De campo a Frío ─────────▶ FRÍO (Dospanca / Galpón)
   └─ Ingreso a Tolvas ────────▶ SANTA ANA (planta, a granel)
                                     │
                                     ├─ Envío a Frío ─▶ Dospanca / Galpón / Cecive
                                     ├─ Retorno de Frío ─▶ Galpón / Santa Ana
                                     └─ Entrega a clientes ─▶ clientes externos

TREVELÍN ── ubicación con su propio ingreso de mercadería
Papa chica ── se deriva a Frigopap / Sasula
```

Del campo, la papa puede ir directo a frío o entrar a la planta de **Santa Ana** (donde se maneja a granel en tolvas). Desde la planta se envía a frigoríficos, retorna al galpón cuando corresponde, o sale directo a clientes. **Trevelín** opera como una ubicación propia con su circuito de ingreso. La **papa chica** (descarte de calibre pequeño) se destina a frigoríficos específicos.

## Ubicaciones

- **Propias:** Santa Ana (planta), Galpón, Dospanca (frigorífico), Trevelín.
- **Otros nodos y destinos externos:** Cecive, Pancani, Teramal, Frigopap, Sasula, Belmonte, Paraguay.

Una ubicación es un nodo donde la mercadería puede estar almacenada. El **stock** de una ubicación es siempre el resultado neto de sus movimientos: lo que ingresó menos lo que salió, discriminado por lote. No existe un stock "declarado" independiente de los movimientos; la mercadería que no tiene movimiento registrado, no existe en el sistema.

## Variedades

Cada partida de papa pertenece a una **variedad**. Las variedades que maneja Papasud incluyen: agata, spunta, asterix, atlantic, daifla, king russet, memphis, sunred, quintera, sagitta, ludmilla, kennebec, kelly, pampeana, sinatra, markies, ikarus, alverstone y "7 four 7".

## Lotes

Un **lote** identifica una partida de mercadería de una variedad. El código de lote **no es global**: cada ubicación numera sus lotes de forma independiente (Trevelín y Santa Ana usan rangos distintos). Por eso un lote sólo tiene sentido junto a su variedad y su ubicación de origen.

## Movimientos

El **movimiento** es la unidad central de la operación. Traslada mercadería de un origen a un destino y registra:

- **Remito** y **fecha**.
- **Variedad** y **lote**.
- **Origen** y **destino** (ubicaciones o clientes).
- **Cantidad**: en kilogramos (unidad base), cantidad de **bolsas**, y si la carga es **a granel**.
- **Kg promedio** por bolsa (típicamente entre 48 y 54 kg).
- **Categoría / calibre** comercial.
- **Transporte** que realizó el traslado.
- **Cliente** y/o **comisionista**, cuando es una entrega.
- **DTV** (documento de tránsito) y **observaciones**.

Los tipos de movimiento que existen en la operación son: ingreso de campo a frío, ingreso a tolvas de Santa Ana, envío a frío, retorno de frío, papa chica, ingreso a Trevelín y entrega a clientes.

Una **salida no puede superar el stock disponible** en la ubicación de origen para ese lote: es la regla que mantiene la coherencia física de la mercadería. Cuando el stock declarado en una ubicación no coincide con el conteo real, la causa suele ser un movimiento no registrado o registrado en un solo extremo (sale del origen pero no se asienta el ingreso en el destino).

## Categorías y calibres

La mercadería se clasifica comercialmente según su destino y calidad: exportación, sin chicas, recibo, granel, descarte a Paraguay, solo chasis. En el circuito de semilla (Trevelín) se usan categorías de calidad inicial (inicial 1, 2 y 3).

## Actores externos

- **Transportes:** Serantes-Vera, Camillo (Gastón / Mario), Arenas (Jaimez / De Grandis), Cerone (Raphael / Sotelo), Álvaro Arenas, S. García, Coronado, Pizzuti, Rastellini, entre otros.
- **Clientes y destinos comerciales:** Parmentier, Wemar–McCain, La Unión del Sur, Frigopap, Agro Selmi, Delcasagro, Radino, Mazzeo, Romero, Francisco Andreu.

## Trazabilidad

Cada movimiento es la unidad de trazabilidad: permite reconstruir en cualquier momento dónde está cada lote, de dónde vino y hacia dónde fue. El stock por ubicación, la disponibilidad de un lote y la documentación de exportación se derivan íntegramente del historial de movimientos.
