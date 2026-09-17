import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/db";
import { sembrar } from "../src/lib/seed-datos";

// `npm run seed`: crea las tablas si no existen (vale igual para el fichero local
// que para una base de datos Turso recién creada) y recarga los datos de la demo.
async function main() {
  const tablas = await prisma.$queryRawUnsafe<unknown[]>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'citas'");
  if (!tablas.length) {
    const dir = join(__dirname, "migrations");
    for (const m of readdirSync(dir).filter((f) => !f.endsWith(".toml")).sort()) {
      const sql = readFileSync(join(dir, m, "migration.sql"), "utf8");
      for (const sentencia of sql.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(sentencia);
      console.log(`Migración aplicada: ${m}`);
    }
  }
  const r = await sembrar(prisma);
  console.log(`Demo cargada: ${r.citas} citas, ${r.bloqueos} bloqueos.`);
}

main().finally(() => prisma.$disconnect());
