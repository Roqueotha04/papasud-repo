// Construcción de archivos .xlsx a partir de filas ya calculadas. No deriva
// nada: recibe los mismos datos que ya muestra la UI y los vuelca a hojas.

import ExcelJS from "exceljs";

export type ExportColumna = { header: string; key: string; width?: number };
export type ExportHoja = {
  nombre: string;
  columnas: ExportColumna[];
  filas: Record<string, unknown>[];
};

export async function construirExcel(hojas: ExportHoja[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Papasud Tech";
  libro.created = new Date();

  for (const hoja of hojas) {
    // Excel limita el nombre de hoja a 31 caracteres.
    const sheet = libro.addWorksheet(hoja.nombre.slice(0, 31));
    sheet.columns = hoja.columnas;
    sheet.addRows(hoja.filas);
    sheet.getRow(1).font = { bold: true };
  }

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
