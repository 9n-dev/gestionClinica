-- CreateTable
CREATE TABLE "intentos" (
    "clave" TEXT NOT NULL,
    "ventana" DATETIME NOT NULL,
    "cuenta" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("clave", "ventana")
);

-- CreateIndex
CREATE INDEX "intentos_ventana_idx" ON "intentos"("ventana");
