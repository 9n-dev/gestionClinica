-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "nombreNorm" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "notas" TEXT,
    "creadoAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Un paciente por cada (teléfono, nombre normalizado) de las citas que ya existían.
-- lower() de SQLite solo entiende ASCII: los acentos se quitan antes, a mano. Equivale a normalizarNombre() de src/lib/pacientes.ts.
INSERT INTO "pacientes" ("id", "nombre", "nombreNorm", "telefono", "email", "creadoAt")
SELECT MIN("id"), MAX("pacienteNombre"), lower(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(trim("pacienteNombre"), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ü', 'u'), 'ñ', 'n'), 'Á', 'A'), 'É', 'E'), 'Í', 'I'), 'Ó', 'O'), 'Ú', 'U'), 'Ü', 'U'), 'Ñ', 'N')), "pacienteTelefono", MAX("pacienteEmail"), MIN("creadaAt")
FROM "citas" GROUP BY "pacienteTelefono", lower(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(trim("pacienteNombre"), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ü', 'u'), 'ñ', 'n'), 'Á', 'A'), 'É', 'E'), 'Í', 'I'), 'Ó', 'O'), 'Ú', 'U'), 'Ü', 'U'), 'Ñ', 'N'));

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
    "pacienteId" TEXT NOT NULL,
    "pacienteNombre" TEXT NOT NULL,
    "pacienteTelefono" TEXT NOT NULL,
    "pacienteEmail" TEXT,
    "notas" TEXT,
    "tokenCancelacion" TEXT NOT NULL,
    "recordatorioEnviadoAt" DATETIME,
    "canceladaAt" DATETIME,
    "creadaAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "citas_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "citas_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "profesionales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "citas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_citas" ("pacienteId", "canceladaAt", "creadaAt", "estado", "fin", "id", "inicio", "notas", "pacienteEmail", "pacienteNombre", "pacienteTelefono", "profesionalId", "recordatorioEnviadoAt", "servicioId", "tokenCancelacion") SELECT (SELECT p."id" FROM "pacientes" p WHERE p."telefono" = "citas"."pacienteTelefono" AND p."nombreNorm" = lower(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(trim("citas"."pacienteNombre"), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ü', 'u'), 'ñ', 'n'), 'Á', 'A'), 'É', 'E'), 'Í', 'I'), 'Ó', 'O'), 'Ú', 'U'), 'Ü', 'U'), 'Ñ', 'N'))), "canceladaAt", "creadaAt", "estado", "fin", "id", "inicio", "notas", "pacienteEmail", "pacienteNombre", "pacienteTelefono", "profesionalId", "recordatorioEnviadoAt", "servicioId", "tokenCancelacion" FROM "citas";
DROP TABLE "citas";
ALTER TABLE "new_citas" RENAME TO "citas";
CREATE UNIQUE INDEX "citas_tokenCancelacion_key" ON "citas"("tokenCancelacion");
CREATE INDEX "citas_profesionalId_inicio_idx" ON "citas"("profesionalId", "inicio");
CREATE INDEX "citas_estado_inicio_idx" ON "citas"("estado", "inicio");
CREATE INDEX "citas_pacienteId_inicio_idx" ON "citas"("pacienteId", "inicio");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_telefono_nombreNorm_key" ON "pacientes"("telefono", "nombreNorm");
