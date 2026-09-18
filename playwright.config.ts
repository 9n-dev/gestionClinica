import { defineConfig } from "@playwright/test";

// Dos servidores con el mismo build de producción:
// - DEMO: modo demo, base de datos recién sembrada. Casi todos los tests.
// - REAL: sin MODO_DEMO y con la base de datos vacía, como una clínica que lo instala (e2e/instalacion.spec.ts).
export const DEMO = { puerto: 3100, bd: "file:./e2e.db" };
export const REAL = { puerto: 3101, bd: "file:./e2e-real.db", url: "http://localhost:3101" };
export const CRON_SECRET = "secreto-del-cron-e2e";

export default defineConfig({
  testDir: "e2e",
  workers: 1, // una sola base de datos SQLite por servidor: los tests van en fila
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${DEMO.puerto}`, locale: "es-ES", timezoneId: "Europe/Madrid", trace: "retain-on-failure" },
  webServer: {
    command: [
      "rm -f e2e.db* e2e-real.db*",
      "npm run seed",
      "npm run build",
      `env DATABASE_URL=${REAL.bd} npm run migrar`,
      `(env MODO_DEMO= DATABASE_URL=${REAL.bd} APP_URL=${REAL.url} npx next start -p ${REAL.puerto} & npx next start -p ${DEMO.puerto})`,
    ].join(" && "),
    url: `http://localhost:${DEMO.puerto}/robots.txt`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      MODO_DEMO: "1",
      DATABASE_URL: DEMO.bd,
      DATABASE_AUTH_TOKEN: "",
      AUTH_SECRET: "secreto-solo-para-las-pruebas-e2e",
      CRON_SECRET,
      APP_URL: `http://localhost:${DEMO.puerto}`,
      RECORDATORIO_VENTANA_HORAS: "120", // cinco días: siempre cae algún día laborable con citas del seed
      RESEND_API_KEY: "", // los emails se quedan en la tabla emails_enviados, que es donde los leen los tests
    },
  },
});
