import { expect, test } from "@playwright/test";
import { DEMO, entrar } from "./ayudas";

test("se cobra una cita con descuento, sale en la caja del día con su forma de pago y se puede anular", async ({ page }) => {
  await entrar(page, DEMO.recepcion, DEMO.password);
  // La demo ya trae cobros de hoy: se mide cuánto sube el Bizum, no su valor absoluto
  const bizumEnCaja = async () => {
    await page.goto("/panel/caja");
    await expect(page.getByRole("heading", { name: "Cobros del día" })).toBeVisible();
    const casilla = page.locator("dl > div").filter({ hasText: "Bizum" });
    return (await casilla.count()) ? Number((await casilla.locator("dd").innerText()).replace(/[^\d,]/g, "").replace(",", ".")) : 0;
  };
  const antes = await bizumEnCaja();
  const dia = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 42 + ((8 - d.getDay()) % 7)); return d.toISOString().slice(0, 10); });
  await page.goto(`/panel/citas/nueva?profesional=marcos-ortiz&servicio=consulta-general&dia=${dia}&hora=12:00`);
  await page.getByLabel("Nombre y apellidos del paciente").fill("Coral Cobro Díaz");
  await page.getByLabel("Teléfono").fill("633000111");
  await page.getByRole("button", { name: "Crear la cita" }).click();
  await page.waitForURL(/\/panel\/citas\/(?!nueva)/);
  const cita = page.url().split("?")[0];

  const cobro = page.getByRole("region", { name: "Cobro" });
  await expect(cobro.getByLabel("Importe (€)")).toHaveValue("40"); // la tarifa de la consulta
  await cobro.getByLabel("Importe (€)").fill("35");
  await cobro.getByLabel("Forma de pago").selectOption({ label: "Bizum" });
  await cobro.getByRole("button", { name: "Marcar como cobrada" }).click();
  await expect(cobro).toContainText(/Cobrada\s*35\s€ · Bizum/);

  expect(await bizumEnCaja()).toBe(antes + 35);
  const fila = page.getByRole("row").filter({ hasText: "Coral Cobro Díaz" });
  await expect(fila).toContainText("Bizum");
  await expect(fila).toContainText(/35\s€/);
  await expect(fila).toContainText(/tarifa 40\s€/);

  await page.goto(cita);
  await cobro.getByRole("button", { name: "Anular el cobro" }).click();
  await expect(cobro.getByRole("button", { name: "Marcar como cobrada" })).toBeVisible();
  await page.goto("/panel/caja");
  await expect(page.getByRole("row").filter({ hasText: "Coral Cobro Díaz" })).toHaveCount(0);
});
