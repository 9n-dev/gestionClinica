import "dotenv/config";
import { prisma } from "../src/lib/db";
import { crearTablasSiFaltan } from "../src/lib/migraciones";
import { sembrar } from "../src/lib/seed-datos";

// `npm run seed`: crea las tablas si no existen (vale igual para el fichero local
// que para una base de datos Turso recién creada) y recarga los datos de la demo.
async function main() {
  for (const m of await crearTablasSiFaltan(prisma)) console.log(`Migración aplicada: ${m}`);
  const r = await sembrar(prisma);
  console.log(`Demo cargada: ${r.citas} citas, ${r.bloqueos} bloqueos.`);
}

main().finally(() => prisma.$disconnect());
