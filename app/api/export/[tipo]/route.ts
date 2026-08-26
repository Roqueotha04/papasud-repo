// Descarga de Excel para las vistas que lo piden. Un handler para los 4
// tipos en vez de 4 archivos casi idénticos; cada caso arma sus columnas a
// partir de los mismos DTOs que ya usan las páginas, sin recalcular nada.

import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/auth";
import { getStock, getMovimientos } from "@/lib/actions/stock";
import { getIndicadores } from "@/lib/actions/indicadores";
import { getMuestreos } from "@/lib/actions/muestreos";
import { filasProyeccion } from "@/app/components/ProyeccionPanel";
import { construirExcel, type ExportHoja } from "@/lib/export-excel";

const TIPOS_VALIDOS = ["stock", "movimientos", "indicadores", "muestreos"] as const;
type Tipo = (typeof TIPOS_VALIDOS)[number];

function esTipoValido(valor: string): valor is Tipo {
  return (TIPOS_VALIDOS as readonly string[]).includes(valor);
}

function redondear(n: number, decimales = 0): number {
  const factor = 10 ** decimales;
  return Math.round(n * factor) / factor;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tipo: string }> },
) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { tipo } = await params;
  if (!esTipoValido(tipo)) {
    return new NextResponse("Tipo de exportación desconocido", { status: 404 });
  }

  const url = new URL(request.url);
  let hojas: ExportHoja[];

  switch (tipo) {
    case "stock": {
      const stock = await getStock();
      hojas = [
        {
          nombre: "Stock",
          columnas: [
            { header: "Ubicación", key: "ubicacion", width: 24 },
            { header: "Tipo", key: "tipo", width: 14 },
            { header: "Variedad", key: "variedad", width: 16 },
            { header: "Lote", key: "lote", width: 10 },
            { header: "Kg", key: "kg", width: 12 },
            { header: "Bolsas", key: "bolsas", width: 10 },
          ],
          filas: stock.flatMap((u) =>
            u.rows.map((r) => ({
              ubicacion: u.location.nombre,
              tipo: u.location.tipo,
              variedad: r.variedad,
              lote: r.lote,
              kg: redondear(r.kg),
              bolsas: r.bolsas,
            })),
          ),
        },
      ];
      break;
    }

    case "movimientos": {
      const movimientos = await getMovimientos(500);
      hojas = [
        {
          nombre: "Movimientos",
          columnas: [
            { header: "Remito", key: "remito", width: 12 },
            { header: "Fecha", key: "fecha", width: 12 },
            { header: "Tipo", key: "tipo", width: 18 },
            { header: "Origen", key: "origen", width: 20 },
            { header: "Destino", key: "destino", width: 20 },
            { header: "Transporte", key: "transporte", width: 18 },
            { header: "Cliente", key: "cliente", width: 18 },
            { header: "Variedad", key: "variedad", width: 14 },
            { header: "Lote", key: "lote", width: 10 },
            { header: "Kg", key: "kg", width: 12 },
            { header: "Bolsas", key: "bolsas", width: 10 },
            { header: "Categoría", key: "categoria", width: 16 },
          ],
          filas: movimientos.flatMap((m) =>
            m.items.map((it) => ({
              remito: m.remito ?? "",
              fecha: m.fecha.slice(0, 10),
              tipo: m.tipo,
              origen: m.origen,
              destino: m.destino,
              transporte: m.transporte ?? "",
              cliente: m.cliente ?? "",
              variedad: it.variedad,
              lote: it.lote,
              kg: redondear(it.kg),
              bolsas: it.bolsas ?? "",
              categoria: it.categoria ?? "",
            })),
          ),
        },
      ];
      break;
    }

    case "indicadores": {
      const campania = url.searchParams.get("campania") ?? undefined;
      const variedad = url.searchParams.get("variedad") ?? undefined;
      const { porParcela } = await getIndicadores({ campania, variedad });
      hojas = [
        {
          nombre: "Indicadores",
          columnas: [
            { header: "Parcela", key: "codigo", width: 12 },
            { header: "Variedad", key: "variedad", width: 16 },
            { header: "Campaña", key: "campania", width: 12 },
            { header: "Superficie ha", key: "superficieHa", width: 14 },
            { header: "Producción kg", key: "produccionKg", width: 16 },
            { header: "Rendimiento kg/ha", key: "rendimientoKgHa", width: 18 },
            { header: "Kg exportación", key: "kgExportacion", width: 16 },
            { header: "% exportación", key: "pctExportacion", width: 14 },
            { header: "Bolsas", key: "bolsas", width: 10 },
          ],
          filas: porParcela.map((p) => ({
            codigo: p.codigo,
            variedad: p.variedad,
            campania: p.campania,
            superficieHa: redondear(p.superficieHa, 2),
            produccionKg: redondear(p.produccionKg),
            rendimientoKgHa: redondear(p.rendimientoKgHa),
            kgExportacion: redondear(p.kgExportacion),
            pctExportacion: redondear(p.pctExportacion, 1),
            bolsas: p.bolsas,
          })),
        },
      ];
      break;
    }

    case "muestreos": {
      const parcelas = await getMuestreos();
      const filas = filasProyeccion(parcelas);
      hojas = [
        {
          nombre: "Proyeccion",
          columnas: [
            { header: "Parcela", key: "codigo", width: 12 },
            { header: "Variedad", key: "variedad", width: 16 },
            { header: "Superficie ha", key: "superficieHa", width: 14 },
            { header: "% proyectado", key: "proyectadoPct", width: 14 },
            { header: "% real", key: "realPct", width: 12 },
            { header: "Desvío pts", key: "desvioPts", width: 12 },
            { header: "Kg ingresados", key: "totalKgIngreso", width: 16 },
            { header: "Kg exportación", key: "kgExportacion", width: 16 },
          ],
          // null se vuelca como texto explícito: no hay dato real todavía,
          // no es un cero.
          filas: filas.map((f) => ({
            codigo: f.codigo,
            variedad: f.variedad,
            superficieHa: redondear(f.superficieHa, 2),
            proyectadoPct: redondear(f.proyectadoPct, 1),
            realPct: f.realPct !== null ? redondear(f.realPct, 1) : "sin ingresos",
            desvioPts: f.desvioPts !== null ? redondear(f.desvioPts, 1) : "",
            totalKgIngreso: redondear(f.totalKgIngreso),
            kgExportacion: redondear(f.kgExportacion),
          })),
        },
      ];
      break;
    }
  }

  const buffer = await construirExcel(hojas);
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${tipo}-${fecha}.xlsx"`,
    },
  });
}
