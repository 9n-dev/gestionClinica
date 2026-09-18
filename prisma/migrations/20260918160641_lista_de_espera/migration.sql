-- CreateTable
CREATE TABLE "en_espera" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "profesionalId" TEXT,
    "preferencia" TEXT,
    "creadoAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendidoAt" DATETIME,
    CONSTRAINT "en_espera_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "en_espera_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "en_espera_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "profesionales" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "en_espera_atendidoAt_creadoAt_idx" ON "en_espera"("atendidoAt", "creadoAt");
