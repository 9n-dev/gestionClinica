import "dotenv/config";
import { MODO_DEMO } from "../src/lib/clinica";
import { prisma } from "../src/lib/db";
import { migrar } from "../src/lib/migraciones";
import { sembrar } from "../src/lib/seed-datos";

// `npm run seed`: aplica las migraciones pendientes (vale igual para el fichero local
// que para Turso) y recarga los datos de la demo.
async function main() {
  // sembrar() empieza borrándolo todo: en una instalación real sería perder la clínica entera.
  if (!MODO_DEMO) throw new Error("npm run seed borra todos los datos y carga los de la demo. Solo funciona con MODO_DEMO=1. Para una clínica real: npm run migrar y npm run crear-admin.");
  for (const m of await migrar()) console.log(`Migración aplicada: ${m}`);
  const r = await sembrar(prisma);
  console.log(`Demo cargada: ${r.citas} citas, ${r.bloqueos} bloqueos.`);
}

main().finally(() => prisma.$disconnect());
