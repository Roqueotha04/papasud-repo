-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('CAMPO', 'PLANTA', 'GALPON', 'FRIGORIFICO', 'CLIENTE');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('CAMPO_A_FRIO', 'INGRESO_TOLVAS', 'ENVIO_A_FRIO', 'RETORNO_FRIO', 'PAPA_CHICA', 'INGRESO_TREVELIN', 'ENTREGA_CLIENTE');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('EXPORTACION', 'SIN_CHICAS', 'RECIBO', 'GRANEL', 'DESCARTE_PARAGUAY', 'SOLO_CHASIS', 'SEMILLA');

-- CreateEnum
CREATE TYPE "Unidad" AS ENUM ('BOLSA', 'GRANEL', 'GRANEL_CHASIS', 'GRANEL_ACOPLADO');

-- CreateEnum
CREATE TYPE "GradoSemilla" AS ENUM ('INICIAL_1', 'INICIAL_2', 'INICIAL_3');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('PROFORMA', 'DTV');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('BORRADOR', 'EMITIDO');

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "LocationType" NOT NULL,
    "esPropia" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "remito" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "MovementType" NOT NULL,
    "transporte" TEXT,
    "cliente" TEXT,
    "comisionista" TEXT,
    "dtv" TEXT,
    "observaciones" TEXT,
    "rawInput" TEXT,
    "parseadoPorIa" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origenId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementItem" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "variedad" TEXT NOT NULL,
    "lote" TEXT NOT NULL,
    "categoria" "Categoria",
    "unidad" "Unidad" NOT NULL DEFAULT 'BOLSA',
    "bolsas" INTEGER,
    "kg" DOUBLE PRECISION NOT NULL,
    "kgPromedio" DOUBLE PRECISION,
    "colorBolsa" TEXT,
    "colorHilo" TEXT,
    "gradoSemilla" "GradoSemilla",

    CONSTRAINT "MovementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportDoc" (
    "id" TEXT NOT NULL,
    "tipo" "DocType" NOT NULL DEFAULT 'PROFORMA',
    "lote" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL,
    "requisitos" JSONB,
    "status" "DocStatus" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_nombre_key" ON "Location"("nombre");

-- CreateIndex
CREATE INDEX "Movement_tipo_idx" ON "Movement"("tipo");

-- CreateIndex
CREATE INDEX "Movement_origenId_idx" ON "Movement"("origenId");

-- CreateIndex
CREATE INDEX "Movement_destinoId_idx" ON "Movement"("destinoId");

-- CreateIndex
CREATE INDEX "MovementItem_lote_idx" ON "MovementItem"("lote");

-- CreateIndex
CREATE INDEX "MovementItem_variedad_idx" ON "MovementItem"("variedad");

-- CreateIndex
CREATE INDEX "MovementItem_movementId_idx" ON "MovementItem"("movementId");

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementItem" ADD CONSTRAINT "MovementItem_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
