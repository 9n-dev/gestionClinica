-- CreateTable
CREATE TABLE "mensajes_enviados" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "error" TEXT,
    "proveedorId" TEXT,
    "citaId" TEXT,
    "enviadoAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mensajes_enviados_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "mensajes_enviados_proveedorId_key" ON "mensajes_enviados"("proveedorId");

-- CreateIndex
CREATE INDEX "mensajes_enviados_enviadoAt_idx" ON "mensajes_enviados"("enviadoAt");
