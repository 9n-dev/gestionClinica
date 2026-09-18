import { expect, test } from "@playwright/test";
import { abrirFicha, DEMO, entrar } from "./ayudas";

test("una cita periódica desde el panel crea toda la serie y avisa de la fecha sin hueco", async ({ page }) => {
  await entrar(page, DEMO.recepcion, DEMO.password);
  // Lunes dentro de cuatro semanas, lejos de las citas del seed: las horas están libres
  const lunes = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 28 + ((8 - d.getDay()) % 7)); return d.toISOString().slice(0, 10); });
  const masSemanas = (n: number) => { const d = new Date(`${lunes}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 7 * n); return d.toISOString().slice(0, 10); };

  // La tercera fecha de la serie (dos semanas después) ya está ocupada a esa hora por otro paciente
  const nueva = async (dia: string, nombre: string, telefono: string, serie?: { cada: string; veces: string }) => {
    await page.goto(`/panel/citas/nueva?profesional=laura-serrano&servicio=quiropodia&dia=${dia}&hora=10:00`);
    await page.getByLabel("Nombre y apellidos del paciente").fill(nombre);
    await page.getByLabel("Teléfono").fill(telefono);
    if (serie) {
      await page.getByLabel("Cada cuánto").selectOption(serie.cada);
      await page.getByLabel("Cuántas citas en total").selectOption(serie.veces);
    }
    await page.getByRole("button", { name: "Crear la cita" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Cita creada" })).toBeVisible();
  };
  await nueva(masSemanas(2), "Olga Ocupa Hueco", "611000111");
  await nueva(lunes, "Sergio Serie Mora", "611000222", { cada: "1", veces: "4" });

  await expect(page.getByRole("status").filter({ hasText: "Cita creada" })).toContainText("otras 2 de la serie");
  await expect(page.getByRole("alert").filter({ hasText: "Sin hueco a esa hora" })).toBeVisible();
  await abrirFicha(page, "sergio serie", "Sergio Serie Mora");
  await expect(page.getByRole("region", { name: "Próximas citas" }).getByRole("listitem")).toHaveCount(3);
});
