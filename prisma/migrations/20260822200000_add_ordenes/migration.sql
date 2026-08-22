-- CreateEnum
CREATE TYPE "CategoriaInsumo" AS ENUM ('HERBICIDA', 'INSECTICIDA', 'FUNGICIDA', 'COADYUVANTE', 'OTRO');

-- CreateEnum
CREATE TYPE "Herramienta" AS ENUM ('DRONE', 'PULVERIZADORA');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('BORRADOR', 'EMITIDA', 'EJECUTADA');

-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "principioActivo" TEXT NOT NULL,
    "categoria" "CategoriaInsumo" NOT NULL,
    "precioUsd" DOUBLE PRECISION NOT NULL,
    "dosisHaRecomendada" DOUBLE PRECISION NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'l/ha',

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaTarea" TIMESTAMP(3) NOT NULL,
    "aplicador" TEXT NOT NULL,
    "herramienta" "Herramienta" NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'EMITIDA',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderLinea" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "dosisHa" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WorkOrderLinea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Insumo_marca_principioActivo_key" ON "Insumo"("marca", "principioActivo");

-- CreateIndex
CREATE INDEX "WorkOrder_fechaTarea_idx" ON "WorkOrder"("fechaTarea");

-- CreateIndex
CREATE INDEX "WorkOrderLinea_workOrderId_idx" ON "WorkOrderLinea"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderLinea_parcelaId_idx" ON "WorkOrderLinea"("parcelaId");

-- AddForeignKey
ALTER TABLE "WorkOrderLinea" ADD CONSTRAINT "WorkOrderLinea_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLinea" ADD CONSTRAINT "WorkOrderLinea_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLinea" ADD CONSTRAINT "WorkOrderLinea_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "Parcela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

