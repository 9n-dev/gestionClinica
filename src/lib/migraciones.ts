import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { prisma as Prisma } from "./db";

/** Aplica las migraciones SQL de prisma/migrations si la base de datos está vacía (fichero local o Turso). */
export async function crearTablasSiFaltan(prisma: typeof Prisma) {
  const tablas = await prisma.$queryRawUnsafe<unknown[]>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'citas'");
  if (tablas.length) return [];
  const dir = join(process.cwd(), "prisma", "migrations");
  const aplicadas = [];
  for (const m of readdirSync(dir).filter((f) => !f.endsWith(".toml")).sort()) {
    const sql = readFileSync(join(dir, m, "migration.sql"), "utf8");
    for (const sentencia of sql.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(sentencia);
    aplicadas.push(m);
  }
  return aplicadas;
}
