// Proyección de cosecha a partir de un muestreo pre-cosecha.
// Función pura, sin IA ni modelos predictivos: aritmética sobre la
// distribución de calibres de la muestra (unos 150-220 tubérculos por
// muestreo, ver AGENTS.md). No consulta la base ni hace I/O.

export type CalibreInput = {
  rango: string;
  ordenRango: number;
  pesoKg: number;
  cantidad: number;
};

export type MuestreoInput = {
  pesoTotalKg: number;
  nTuberculos: number;
  tallos: number | null;
  tallosPorMetro: number | null;
  calibres: CalibreInput[];
};

export type SalidaComercial = "EXPORTACION" | "SIN_CHICAS" | "DESCARTE_SEMILLA";

export type CalibreDistribucion = {
  rango: string;
  ordenRango: number;
  pesoKg: number;
  cantidad: number;
  /** % en peso de este rango sobre el peso total de la muestra. */
  pctPeso: number;
  /** % en cantidad de este rango sobre los tubérculos totales de la muestra. */
  pctCantidad: number;
  /** Peso medio del tubérculo DENTRO de este rango (pesoKg / cantidad). */
  pesoMedioTuberculoKg: number;
  salida: SalidaComercial;
};

export type ProyeccionComercial = {
  pctExportacion: number;
  pctSinChicas: number;
  pctDescarteSemilla: number;
};

export type RendimientoEstimado =
  | {
      disponible: true;
      pesoMedioTuberculoKg: number;
      tuberculosPorTallo: number | null;
      /** kg de tubérculo por metro lineal de surco. Requiere tallosPorMetro. */
      kgPorMetroLineal: number | null;
      nota: string;
    }
  | { disponible: false; motivo: string };

export type ProyeccionMuestreo = {
  distribucionCalibres: CalibreDistribucion[];
  comercial: ProyeccionComercial;
  rendimiento: RendimientoEstimado;
};

// ---------------------------------------------------------------------------
// Clasificación comercial por calibre
// ---------------------------------------------------------------------------
//
// Los rangos de calibre vienen como texto libre y cada muestreo usa sus
// propios cortes (">60"/"55-60"/... en un muestreo, ">55"/"45-55"/... en
// otro). Para poder clasificar de forma uniforme, cada rango se parsea a un
// milimetraje representativo:
//   - "A-B"  -> punto medio (A+B)/2
//   - ">X"   -> X + 5 (el rango abierto hacia arriba no tiene punto medio;
//               se asume un tubérculo apenas por encima del corte)
//   - "<X"   -> X - 5 (misma idea, hacia abajo)
//
// Ese milimetraje se clasifica en tres salidas comerciales con estos
// umbrales (aproximados, criterio agronómico estándar de papa para
// exportación):
//   > 45 mm        -> Exportación (calibre grande)
//   30 mm - 45 mm  -> Sin chicas (calibre medio)
//   < 30 mm        -> Descarte / semilla (calibre chico)
//
// Calibración: en el muestreo de Atlantic (parcela 41, Rootex) de la
// planilla del cliente, el reparto real fue 87% exportación / 11,8% sin
// chicas / 1,1% semilla. Con estos umbrales, ese mismo muestreo da
// aproximadamente 88,3% / 9,8% / 2,0%: mismo orden de magnitud. Los otros
// muestreos sembrados (Asterix, Agata) dan entre 61% y 88% de exportación
// según variedad y tratamiento, lo cual es razonable: no todos los ensayos
// tienen que parecerse al de referencia.
const UMBRAL_EXPORTACION_MM = 45;
const UMBRAL_SIN_CHICAS_MM = 30;

/** Parsea un rango de calibre en texto a un milimetraje representativo. */
export function calibreRepresentativoMm(rango: string): number | null {
  const limpio = rango.trim();
  if (limpio.startsWith(">")) {
    const n = Number(limpio.slice(1));
    return Number.isFinite(n) ? n + 5 : null;
  }
  if (limpio.startsWith("<")) {
    const n = Number(limpio.slice(1));
    return Number.isFinite(n) ? n - 5 : null;
  }
  const partes = limpio.split("-");
  if (partes.length === 2) {
    const a = Number(partes[0]);
    const b = Number(partes[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
  }
  return null;
}

function clasificar(rango: string): SalidaComercial {
  const mm = calibreRepresentativoMm(rango);
  // Rango no parseable: no se descarta el peso, se lo trata como
  // descarte/semilla (la clasificación más conservadora) en vez de asumir
  // exportación sobre un dato que no se pudo interpretar.
  if (mm === null) return "DESCARTE_SEMILLA";
  if (mm > UMBRAL_EXPORTACION_MM) return "EXPORTACION";
  if (mm >= UMBRAL_SIN_CHICAS_MM) return "SIN_CHICAS";
  return "DESCARTE_SEMILLA";
}

function pct(parte: number, total: number): number {
  return total > 0 ? (parte / total) * 100 : 0;
}

/**
 * Calcula, a partir de un muestreo pre-cosecha:
 *  1. La distribución por calibre (% en peso, % en cantidad, peso medio).
 *  2. La proyección comercial (% exportación / sin chicas / descarte-semilla).
 *  3. El rendimiento estimado, SOLO si el muestreo trae tallosPorMetro. Si no
 *     lo trae, no se inventa: se devuelve disponible=false y el llamador
 *     debe mostrar únicamente el reparto por calibre.
 */
export function proyectarMuestreo(m: MuestreoInput): ProyeccionMuestreo {
  const calibresOrdenados = [...m.calibres].sort(
    (a, b) => a.ordenRango - b.ordenRango,
  );
  const totalPesoKg = calibresOrdenados.reduce((s, c) => s + c.pesoKg, 0);
  const totalCantidad = calibresOrdenados.reduce((s, c) => s + c.cantidad, 0);

  const distribucionCalibres: CalibreDistribucion[] = calibresOrdenados.map(
    (c) => ({
      rango: c.rango,
      ordenRango: c.ordenRango,
      pesoKg: c.pesoKg,
      cantidad: c.cantidad,
      pctPeso: pct(c.pesoKg, totalPesoKg),
      pctCantidad: pct(c.cantidad, totalCantidad),
      pesoMedioTuberculoKg: c.cantidad > 0 ? c.pesoKg / c.cantidad : 0,
      salida: clasificar(c.rango),
    }),
  );

  let pesoExportacion = 0;
  let pesoSinChicas = 0;
  let pesoDescarte = 0;
  for (const c of distribucionCalibres) {
    if (c.salida === "EXPORTACION") pesoExportacion += c.pesoKg;
    else if (c.salida === "SIN_CHICAS") pesoSinChicas += c.pesoKg;
    else pesoDescarte += c.pesoKg;
  }

  const comercial: ProyeccionComercial = {
    pctExportacion: pct(pesoExportacion, totalPesoKg),
    pctSinChicas: pct(pesoSinChicas, totalPesoKg),
    pctDescarteSemilla: pct(pesoDescarte, totalPesoKg),
  };

  const pesoMedioTuberculoKg =
    m.nTuberculos > 0 ? m.pesoTotalKg / m.nTuberculos : 0;

  let rendimiento: RendimientoEstimado;
  if (m.tallosPorMetro != null && m.tallosPorMetro > 0) {
    // tuberculosPorTallo requiere además el conteo de tallos de la muestra
    // (no siempre está, ver schema: Muestreo.tallos es opcional).
    const tuberculosPorTallo =
      m.tallos && m.tallos > 0 ? m.nTuberculos / m.tallos : null;
    const kgPorMetroLineal =
      tuberculosPorTallo != null
        ? tuberculosPorTallo * m.tallosPorMetro * pesoMedioTuberculoKg
        : null;
    rendimiento = {
      disponible: true,
      pesoMedioTuberculoKg,
      tuberculosPorTallo,
      kgPorMetroLineal,
      nota:
        "Estimado en kg por metro lineal de surco. Para pasarlo a kg/ha " +
        "falta el ancho entre surcos: ese dato no está en el modelo, así " +
        "que no se inventa un valor.",
    };
  } else {
    rendimiento = {
      disponible: false,
      motivo:
        "Este muestreo no registró tallos por metro: no hay base para " +
        "estimar rendimiento, solo el reparto por calibre.",
    };
  }

  return { distribucionCalibres, comercial, rendimiento };
}

// ---------------------------------------------------------------------------
// Formato es-AR (helpers propios de este módulo)
// ---------------------------------------------------------------------------

export function formatNumeroProy(n: number, decimales = 1): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: decimales,
    minimumFractionDigits: 0,
  }).format(n);
}
