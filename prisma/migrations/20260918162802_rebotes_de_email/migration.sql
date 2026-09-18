-- Id del email en Resend, para que el webhook de rebotes encuentre a cuál se refiere.
-- La columna es nueva (todo NULL), así que el índice único no puede chocar con nada.
ALTER TABLE "emails_enviados" ADD COLUMN "proveedorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "emails_enviados_proveedorId_key" ON "emails_enviados"("proveedorId");
