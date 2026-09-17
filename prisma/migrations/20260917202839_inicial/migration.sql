-- CreateTable
CREATE TABLE "profesionales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    "precioCent" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "horarios_laborales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profesionalId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "minInicio" INTEGER NOT NULL,
    "minFin" INTEGER NOT NULL,
    CONSTRAINT "horarios_laborales_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "profesionales" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "citas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servicioId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "inicio" DATETIME NOT NULL,
    "fin" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'CONFIRMADA',
    "pacienteNombre" TEXT NOT NULL,
    "pacienteTelefono" TEXT NOT NULL,
    "pacienteEmail" TEXT NOT NULL,
    "tokenCancelacion" TEXT NOT NULL,
    "recordatorioEnviadoAt" DATETIME,
    "canceladaAt" DATETIME,
    "creadaAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "citas_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "citas_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "profesionales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "franjas_ocupadas" (
    "profesionalId" TEXT NOT NULL,
    "inicio" DATETIME NOT NULL,
    "citaId" TEXT NOT NULL,

    PRIMARY KEY ("profesionalId", "inicio"),
    CONSTRAINT "franjas_ocupadas_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "profesionales" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "franjas_ocupadas_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bloqueos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profesionalId" TEXT,
    "inicio" DATETIME NOT NULL,
    "fin" DATETIME NOT NULL,
    "motivo" TEXT NOT NULL,
    "creadoAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bloqueos_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "profesionales" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "emails_enviados" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "error" TEXT,
    "citaId" TEXT,
    "enviadoAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "emails_enviados_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "profesionales_slug_key" ON "profesionales"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_slug_key" ON "servicios"("slug");

-- CreateIndex
CREATE INDEX "horarios_laborales_profesionalId_diaSemana_idx" ON "horarios_laborales"("profesionalId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "citas_tokenCancelacion_key" ON "citas"("tokenCancelacion");

-- CreateIndex
CREATE INDEX "citas_profesionalId_inicio_idx" ON "citas"("profesionalId", "inicio");

-- CreateIndex
CREATE INDEX "citas_estado_inicio_idx" ON "citas"("estado", "inicio");

-- CreateIndex
CREATE INDEX "franjas_ocupadas_citaId_idx" ON "franjas_ocupadas"("citaId");

-- CreateIndex
CREATE INDEX "bloqueos_inicio_fin_idx" ON "bloqueos"("inicio", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "emails_enviados_enviadoAt_idx" ON "emails_enviados"("enviadoAt");
