// Barrel de server actions. El frontend importa desde `@/lib/actions`.
// Un modulo por dominio, cada uno con su propio "use server".

export {
  getLocations,
  getStock,
  getMovimientos,
  registrarMovimiento,
  detectarDiscrepancias,
} from "./stock";
export { getIndicadores, getVariedadesIndicadores } from "./indicadores";
export { getMuestreos } from "./muestreos";
