import "dotenv/config";
import { defineConfig } from "prisma/config";

// Solo lo usa el CLI (migrate/generate) y siempre contra el fichero local.
// Turso se inicializa con `npm run seed`, que aplica las migraciones por SQL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: "file:./dev.db" },
});
