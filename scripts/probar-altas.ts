import "dotenv/config";
import {
  crearConteo,
  crearMuestreo,
  crearOrdenTrabajo,
  crearParcela,
  getCampanias,
  getInsumosSelect,
  getParcelasSelect,
  getUbicacionesPropias,
} from "@/lib/actions/altas";

async function main() {
  const campanias = await getCampanias();
  const ubicaciones = await getUbicacionesPropias();
  const insumos = await getInsumosSelect();

  // 1. Parcela
  const p = await crearParcela({
    codigo: "TEST-99",
    variedad: "agata",
    superficieHa: 5.5,
    campaniaId: campanias[0]!.id,
    pivote: "A",
    tercio: 2,
  });
  console.log("crearParcela:", p);

  // 1b. Duplicado (debe fallar con mensaje prolijo)
  const dup = await crearParcela({
    codigo: "TEST-99",
    variedad: "agata",
    superficieHa: 5.5,
    campaniaId: campanias[0]!.id,
  });
  console.log("crearParcela duplicada:", dup);

  const parcelas = await getParcelasSelect();
  const parcelaId = p.ok ? p.id : parcelas[0]!.id;

  // 2. Muestreo
  const m = await crearMuestreo({
    parcelaId,
    fecha: new Date().toISOString(),
    tratamiento: "Prueba",
    pesoTotalKg: 32.5,
    nTuberculos: 180,
    tallos: 42,
    tallosPorMetro: 3.4,
    calibres: [
      { rango: "45-55", pesoKg: 12.5, cantidad: 60 },
      { rango: "55-65", pesoKg: 14, cantidad: 70 },
      { rango: "30-45", pesoKg: 6, cantidad: 50 },
    ],
  });
  console.log("crearMuestreo:", m);

  // 2b. Sin líneas (debe fallar)
  const mSinLineas = await crearMuestreo({
    parcelaId,
    fecha: new Date().toISOString(),
    pesoTotalKg: 10,
    nTuberculos: 10,
    calibres: [],
  });
  console.log("crearMuestreo sin lineas:", mSinLineas);

  // 3. Conteo
  const c = await crearConteo({
    locationId: ubicaciones[0]!.id,
    variedad: "agata",
    lote: "TEST-LOTE",
    kgContado: 1234,
    fecha: new Date().toISOString(),
  });
  console.log("crearConteo:", c);

  // 4. Orden de trabajo
  const o = await crearOrdenTrabajo({
    parcelaId,
    fechaEmision: new Date().toISOString(),
    fechaTarea: new Date().toISOString(),
    aplicador: "Prueba",
    herramienta: "DRONE",
    estado: "EMITIDA",
    lineas: [
      { insumoId: insumos[0]!.id, dosisHa: 2.5 },
      { insumoId: insumos[1]!.id, dosisHa: 1.5 },
    ],
  });
  console.log("crearOrdenTrabajo:", o);

  // 4b. Dosis en cero (debe fallar)
  const oMala = await crearOrdenTrabajo({
    parcelaId,
    fechaEmision: new Date().toISOString(),
    fechaTarea: new Date().toISOString(),
    aplicador: "Prueba",
    herramienta: "DRONE",
    estado: "EMITIDA",
    lineas: [{ insumoId: insumos[0]!.id, dosisHa: 0 }],
  });
  console.log("crearOrdenTrabajo dosis 0:", oMala);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FALLO:", e);
    process.exit(1);
  });
