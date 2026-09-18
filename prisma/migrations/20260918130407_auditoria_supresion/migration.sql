-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN "eliminadoAt" DATETIME;

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creadoAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "usuarioEmail" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" TEXT,
    CONSTRAINT "auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "auditoria_creadoAt_idx" ON "auditoria"("creadoAt");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidadId_idx" ON "auditoria"("entidad", "entidadId");
