-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'EQUIPO',
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "accesoTokenHash" TEXT,
    "accesoExpira" DATETIME,
    "profesionalId" TEXT,
    CONSTRAINT "usuarios_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "profesionales" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Hasta ahora todos los usuarios podían hacerlo todo: los que ya existían pasan a ser ADMIN para que nadie se quede sin acceso.
INSERT INTO "new_usuarios" ("email", "id", "nombre", "passwordHash", "profesionalId", "rol") SELECT "email", "id", "nombre", "passwordHash", "profesionalId", 'ADMIN' FROM "usuarios";
DROP TABLE "usuarios";
ALTER TABLE "new_usuarios" RENAME TO "usuarios";
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "usuarios_accesoTokenHash_key" ON "usuarios"("accesoTokenHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
