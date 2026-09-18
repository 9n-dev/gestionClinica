-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_citas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servicioId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "inicio" DATETIME NOT NULL,
    "fin" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'CONFIRMADA',
    "pacienteNombre" TEXT NOT NULL,
    "pacienteTelefono" TEXT NOT NULL,
    "pacienteEmail" TEXT,
    "notas" TEXT,
    "tokenCancelacion" TEXT NOT NULL,
    "recordatorioEnviadoAt" DATETIME,
    "canceladaAt" DATETIME,
    "creadaAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "citas_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "citas_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "profesionales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_citas" ("canceladaAt", "creadaAt", "estado", "fin", "id", "inicio", "pacienteEmail", "pacienteNombre", "pacienteTelefono", "profesionalId", "recordatorioEnviadoAt", "servicioId", "tokenCancelacion") SELECT "canceladaAt", "creadaAt", "estado", "fin", "id", "inicio", "pacienteEmail", "pacienteNombre", "pacienteTelefono", "profesionalId", "recordatorioEnviadoAt", "servicioId", "tokenCancelacion" FROM "citas";
DROP TABLE "citas";
ALTER TABLE "new_citas" RENAME TO "citas";
CREATE UNIQUE INDEX "citas_tokenCancelacion_key" ON "citas"("tokenCancelacion");
CREATE INDEX "citas_profesionalId_inicio_idx" ON "citas"("profesionalId", "inicio");
CREATE INDEX "citas_estado_inicio_idx" ON "citas"("estado", "inicio");
CREATE TABLE "new_usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "profesionalId" TEXT,
    CONSTRAINT "usuarios_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "profesionales" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_usuarios" ("email", "id", "nombre", "passwordHash") SELECT "email", "id", "nombre", "passwordHash" FROM "usuarios";
DROP TABLE "usuarios";
ALTER TABLE "new_usuarios" RENAME TO "usuarios";
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
