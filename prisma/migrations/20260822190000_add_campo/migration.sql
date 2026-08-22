-- AlterTable
ALTER TABLE "Movement" ADD COLUMN     "parcelaId" TEXT;

-- CreateTable
CREATE TABLE "Campania" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campania_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcela" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "pivote" TEXT,
    "tercio" INTEGER,
    "superficieHa" DOUBLE PRECISION NOT NULL,
    "variedad" TEXT NOT NULL,
    "campaniaId" TEXT NOT NULL,

    CONSTRAINT "Parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Muestreo" (
    "id" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tratamiento" TEXT,
    "pesoTotalKg" DOUBLE PRECISION NOT NULL,
    "nTuberculos" INTEGER NOT NULL,
    "tallos" INTEGER,
    "tallosPorMetro" DOUBLE PRECISION,

    CONSTRAINT "Muestreo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MuestreoCalibre" (
    "id" TEXT NOT NULL,
    "muestreoId" TEXT NOT NULL,
    "rango" TEXT NOT NULL,
    "ordenRango" INTEGER NOT NULL,
    "pesoKg" DOUBLE PRECISION NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "MuestreoCalibre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campania_nombre_key" ON "Campania"("nombre");

-- CreateIndex
CREATE INDEX "Parcela_variedad_idx" ON "Parcela"("variedad");

-- CreateIndex
CREATE UNIQUE INDEX "Parcela_codigo_campaniaId_key" ON "Parcela"("codigo", "campaniaId");

-- CreateIndex
CREATE INDEX "Muestreo_parcelaId_idx" ON "Muestreo"("parcelaId");

-- CreateIndex
CREATE INDEX "MuestreoCalibre_muestreoId_idx" ON "MuestreoCalibre"("muestreoId");

-- CreateIndex
CREATE INDEX "Movement_parcelaId_idx" ON "Movement"("parcelaId");

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_campaniaId_fkey" FOREIGN KEY ("campaniaId") REFERENCES "Campania"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Muestreo" ADD CONSTRAINT "Muestreo_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "Parcela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MuestreoCalibre" ADD CONSTRAINT "MuestreoCalibre_muestreoId_fkey" FOREIGN KEY ("muestreoId") REFERENCES "Muestreo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "Parcela"("id") ON DELETE SET NULL ON UPDATE CASCADE;

