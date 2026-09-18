import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

// `prisma migrate deploy` no habla con Turso, así que las migraciones de prisma/migrations se aplican desde aquí:
// en `npm run build` (cada despliegue) y en `npm run seed`. Lo aplicado se apunta en la tabla _migraciones.

// Bases de datos anteriores a la tabla _migraciones: se reconoce lo que ya tienen por una huella en el esquema.
// Solo hace falta para estas cinco; de las siguientes siempre hay registro.
const tiene = (tabla: string, columna = "") => `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '${tabla}' AND sql LIKE '%"${columna}%'`;
const HUELLAS: Record<string, string> = {
  "20260917202839_inicial": tiene("citas"),
  "20260918104847_panel_avanzado": tiene("citas", "notas"),
  "20260918115342_pacientes": tiene("pacientes"),
  "20260918115858_roles_usuarios": tiene("usuarios", "rol"),
  "20260918120617_limite_intentos": tiene("intentos"),
};

/** Aplica las migraciones pendientes, en orden, y devuelve sus nombres. Se puede llamar las veces que haga falta. */
export async function migrar(url = process.env.DATABASE_URL ?? "file:./dev.db", authToken = process.env.DATABASE_AUTH_TOKEN || undefined) {
  const db = createClient({ url, authToken });
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS "_migraciones" ("nombre" TEXT NOT NULL PRIMARY KEY, "aplicadaAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    const hay = async (sql: string) => (await db.execute(sql)).rows.length > 0;
    const hechas = new Set((await db.execute(`SELECT "nombre" FROM "_migraciones"`)).rows.map((r) => String(r.nombre)));
    // En local las aplica `prisma migrate dev`, que lleva su propia cuenta.
    if (await hay(tiene("_prisma_migrations")))
      for (const r of (await db.execute(`SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`)).rows) hechas.add(String(r.migration_name));

    const dir = join(process.cwd(), "prisma", "migrations");
    const aplicadas: string[] = [];
    for (const m of readdirSync(dir).filter((f) => !f.endsWith(".toml")).sort()) {
      const apuntar = { sql: `INSERT OR IGNORE INTO "_migraciones" ("nombre") VALUES (?)`, args: [m] };
      if (hechas.has(m) || (HUELLAS[m] && (await hay(HUELLAS[m])))) {
        await db.execute(apuntar);
        continue;
      }
      const sentencias = readFileSync(join(dir, m, "migration.sql"), "utf8")
        .replace(/^\s*--.*$/gm, "")
        .split(/;\s*$/m)
        .map((s) => s.trim())
        .filter((s) => s && !/^PRAGMA\b/i.test(s)); // de las claves foráneas se ocupa migrate()
      // migrate(): todo el lote en una transacción y con las claves foráneas apagadas en esa misma conexión.
      // Sentencia a sentencia, el DROP TABLE "citas" de una migración que rehace la tabla borraría en cascada
      // las franjas ocupadas, porque con Turso por HTTP el PRAGMA de una petición no vale para la siguiente.
      await db.migrate([...sentencias, apuntar]);
      aplicadas.push(m);
    }
    return aplicadas;
  } finally {
    db.close();
  }
}
