-- CreateTable
CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variedad" TEXT NOT NULL,
    "lote" TEXT NOT NULL,
    "kgContado" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockCount_locationId_idx" ON "StockCount"("locationId");

-- CreateIndex
CREATE INDEX "StockCount_lote_idx" ON "StockCount"("lote");

-- AddForeignKey
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

