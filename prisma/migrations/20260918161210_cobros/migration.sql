-- AlterTable
ALTER TABLE "citas" ADD COLUMN "cobradoCent" INTEGER;
ALTER TABLE "citas" ADD COLUMN "formaPago" TEXT;
ALTER TABLE "citas" ADD COLUMN "pagadaAt" DATETIME;

-- CreateIndex
CREATE INDEX "citas_pagadaAt_idx" ON "citas"("pagadaAt");
