import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { CRON_SECRET, REAL } from "../playwright.config";
import { entrar } from "./ayudas";

// Una clínica que lo instala: sin MODO_DEMO, base de datos recién migrada y vacía.
test.use({ baseURL: REAL.url });

test("de la base de datos vacía a la primera cita reservable, sin rastro de la demo", async ({ page, request }) => {
  const jefa = { email: "jefa@clinica.test", password: "la clave de la jefa 2026" };

  // 1. El primer usuario sale de la línea de comandos, con un enlace para elegir contraseña
  const salida = execSync(`npx tsx prisma/crear-admin.ts ${jefa.email} "Ana Jefa"`, {
    env: { ...process.env, MODO_DEMO: "", DATABASE_URL: REAL.bd, APP_URL: REAL.url, RESEND_API_KEY: "" },
    encoding: "utf8",
  });
  const enlace = salida.match(/http\S+\/panel\/acceso\/[\w-]+/)?.[0];
  expect(enlace, salida).toBeTruthy();
  await page.goto(new URL(enlace!).pathname);
  await page.getByLabel("Contraseña nueva").fill(jefa.password);
  await page.getByLabel("Repítela").fill(jefa.password);
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();

  // 2. El login de una clínica real no enseña contraseñas ni avisos de demo
  await expect(page.getByText("Contraseña guardada")).toBeVisible();
  await expect(page.getByText("Usuarios de demostración")).toHaveCount(0);
  await expect(page.getByText("Esta es una demo")).toHaveCount(0);
  await expect(page.getByLabel("Email")).toHaveValue("");
  await entrar(page, jefa.email, jefa.password);

  // 3. Configuración: profesional, su horario y un servicio
  await page.getByRole("link", { name: "Configuración" }).click();
  await page.getByText("Añadir un profesional").click();
  const altaPro = page.locator("form").filter({ hasText: "Añadir profesional" });
  await altaPro.getByLabel("Nombre").fill("Dra. Ana Jefa");
  await altaPro.getByLabel("Título y colegiado").fill("Podóloga. Colegiada n.º 28-1234");
  await altaPro.getByLabel("Presentación").fill("Veinte años de experiencia.");
  await altaPro.getByRole("button", { name: "Añadir profesional" }).click();
  await expect(page.getByRole("heading", { name: "Dra. Ana Jefa" })).toBeVisible();

  for (const dia of ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]) {
    await page.getByLabel(`${dia}, mañana, desde`).fill("09:00");
    await page.getByLabel(`${dia}, mañana, hasta`).fill("14:00");
  }
  await page.getByRole("button", { name: "Guardar horario" }).click();
  await expect(page.getByText("Horario guardado")).toBeVisible();

  await page.getByText("Añadir un servicio").click();
  const altaServicio = page.locator("form").filter({ hasText: "Añadir servicio" });
  await altaServicio.getByLabel("Nombre").fill("Quiropodia");
  await altaServicio.getByLabel("Descripción").fill("Cuidado integral del pie.");
  await altaServicio.getByLabel("Minutos").fill("45");
  await altaServicio.getByLabel("Precio").fill("45");
  await altaServicio.getByRole("button", { name: "Añadir servicio" }).click();
  await expect(altaServicio.getByRole("status")).toContainText("Servicio creado");

  // 4. La web pública ya ofrece huecos, y el horario del pie sale del que se acaba de poner
  await page.goto("/reservar");
  await page.getByRole("link", { name: /Quiropodia/ }).click();
  await page.getByRole("link", { name: /Ana Jefa/ }).click();
  await page.getByRole("link", { name: "Semana siguiente" }).click();
  await expect(page.getByRole("link", { name: "09:00" })).toBeVisible();
  const pie = page.getByRole("contentinfo");
  await expect(pie.getByText("Lunes a viernes")).toBeVisible();
  await expect(pie.getByText("9:00 – 14:00")).toBeVisible();

  // 4b. Un segundo servicio que ella no hace: en la reserva pública nadie lo ofrece con ella
  await page.goto("/panel/configuracion");
  await page.getByText("Añadir un servicio").click();
  await altaServicio.getByLabel("Nombre").fill("Estudio de la pisada");
  await altaServicio.getByLabel("Descripción").fill("Análisis biomecánico.");
  await altaServicio.getByLabel("Minutos").fill("60");
  await altaServicio.getByLabel("Precio").fill("80");
  await altaServicio.getByRole("button", { name: "Añadir servicio" }).click();
  await expect(altaServicio.getByRole("status")).toContainText("Servicio creado");
  const fichaAna = page.locator("form").filter({ has: page.locator('input[value="Dra. Ana Jefa"]') });
  await fichaAna.getByLabel("Estudio de la pisada").uncheck();
  await fichaAna.getByRole("button", { name: "Guardar" }).click();
  await expect(fichaAna.getByRole("status")).toContainText("Guardado");
  await page.goto("/reservar?servicio=estudio-de-la-pisada");
  await expect(page.getByRole("heading", { name: "¿Con quién?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ana Jefa/ })).toHaveCount(0);
  await page.goto("/reservar?servicio=quiropodia");
  await expect(page.getByRole("link", { name: /Ana Jefa/ })).toBeVisible();

  // 5. El cron que reinicia la demo aquí no existe, ni con el secreto bueno: borraría la clínica entera
  const reinicio = await request.get("/api/cron/reset-demo", { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  expect(reinicio.status()).toBe(404);
  await page.goto("/panel/usuarios");
  await expect(page.locator(`input[value="${jefa.email}"]`)).toBeVisible();
});
