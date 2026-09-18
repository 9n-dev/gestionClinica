import { expect, test } from "@playwright/test";
import { CRON_SECRET } from "../playwright.config";
import { DEMO, entrar } from "./ayudas";

test("el cron de recordatorios avisa al móvil a todos, también a quien no tiene email, y no repite", async ({ page, request }) => {
  const cron = () => request.get("/api/cron/recordatorios", { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  expect((await request.get("/api/cron/recordatorios")).status()).toBe(401);

  const primera = await (await cron()).json();
  expect(primera.pendientes).toBeGreaterThan(0);
  expect(primera.enviados).toBe(primera.pendientes);
  expect(await (await cron()).json()).toMatchObject({ pendientes: 0, enviados: 0 }); // idempotente

  await entrar(page, DEMO.recepcion, DEMO.password);
  await page.getByRole("link", { name: "Emails y mensajes" }).click();
  const mensajes = page.getByRole("region", { name: "Mensajes al móvil" }).getByRole("listitem");
  await expect(mensajes.filter({ hasText: "te recordamos tu cita" }).filter({ hasText: "Consola" }).first()).toBeVisible();
  expect(await mensajes.count()).toBeGreaterThanOrEqual(primera.enviados);
});
