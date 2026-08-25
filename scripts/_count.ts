import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const [parcelas, muestreos, calibres, conteos, ordenes, lineas] = await Promise.all([
    prisma.parcela.count(), prisma.muestreo.count(), prisma.muestreoCalibre.count(),
    prisma.stockCount.count(), prisma.workOrder.count(), prisma.workOrderLinea.count(),
  ]);
  console.log({ parcelas, muestreos, calibres, conteos, ordenes, lineas });
  const test = await prisma.parcela.findFirst({ where: { codigo: "TEST-99" }, select: { codigo: true, superficieHa: true } });
  const ord = await prisma.workOrder.findFirst({ orderBy: { numero: "desc" }, select: { numero: true, aplicador: true } });
  const cnt = await prisma.stockCount.findFirst({ where: { lote: "TEST-LOTE" }, select: { lote: true, kgContado: true } });
  const mue = await prisma.muestreo.findFirst({ where: { tratamiento: "Prueba" }, select: { tratamiento: true, nTuberculos: true, calibres: { select: { rango: true } } } });
  console.log({ test, ultimaOrden: ord, conteoTest: cnt, muestreoTest: mue });
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
