import { defineConfig } from "@playwright/test";

const PUERTO = 3100;

// Pruebas de extremo a extremo contra el build de producción, con su propia base de datos recién sembrada.
export default defineConfig({
  testDir: "e2e",
  workers: 1, // una sola base de datos SQLite: los tests van en fila
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PUERTO}`, locale: "es-ES", timezoneId: "Europe/Madrid", trace: "retain-on-failure" },
  webServer: {
    command: `npm run seed && npm run build && npm run start -- -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}/robots.txt`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "file:./e2e.db",
      DATABASE_AUTH_TOKEN: "",
      AUTH_SECRET: "secreto-solo-para-las-pruebas-e2e",
      APP_URL: `http://localhost:${PUERTO}`,
      RESEND_API_KEY: "", // los emails se quedan en la tabla emails_enviados, que es donde los leen los tests
    },
  },
});
