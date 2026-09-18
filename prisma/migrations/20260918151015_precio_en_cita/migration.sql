-- Precio del servicio en el momento de reservar. Sin rehacer la tabla: una columna nueva con valor por defecto.
ALTER TABLE "citas" ADD COLUMN "precioCent" INTEGER NOT NULL DEFAULT 0;

-- De las citas que ya existían, lo mejor que se sabe es la tarifa de hoy.
UPDATE "citas" SET "precioCent" = (SELECT "precioCent" FROM "servicios" WHERE "servicios"."id" = "citas"."servicioId");
