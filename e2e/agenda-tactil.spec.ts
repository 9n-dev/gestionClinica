import { expect, test } from "@playwright/test";
import { abrirFicha, DEMO, entrar, reservarPorLaWeb } from "./ayudas";

// La tablet de recepción: pantalla táctil, sin arrastrar y soltar.
test.use({ hasTouch: true, viewport: { width: 1024, height: 768 } });

test("en una tablet se mueve una cita tocándola y tocando la hora nueva", async ({ page }) => {
  const paciente = { nombre: "Tadeo Tablet Gil", telefono: "677 888 999", email: "tadeo@paciente.test" };
  await reservarPorLaWeb(page, paciente);

  await entrar(page, DEMO.recepcion, DEMO.password);
  await abrirFicha(page, "tadeo", paciente.nombre);
  await page.getByRole("region", { name: "Próximas citas" }).getByRole("link").last().tap();
  await page.getByRole("link", { name: "Volver a la agenda de ese día" }).tap();

  const cita = page.getByRole("link", { name: new RegExp(paciente.nombre) });
  const horaAntes = (await cita.innerText()).slice(0, 5);
  await page.getByRole("button", { name: "Mover una cita" }).tap();
  await page.getByRole("button", { name: new RegExp(paciente.nombre) }).tap(); // en este modo la cita es un botón: se elige, no se abre
  await expect(page).toHaveURL(/\/panel\/agenda/); // en este modo, tocar la cita no abre su detalle

  const destinos = page.getByRole("button", { name: /^Mover a las/ });
  const destino = destinos.last(); // el último hueco libre del día: seguro que no es donde estaba
  const horaNueva = (await destino.getAttribute("aria-label"))!.match(/(\d{1,2}:\d{2})/)![1].padStart(5, "0");
  expect(horaNueva).not.toBe(horaAntes);
  await destino.tap();

  await expect(page.getByRole("status").filter({ hasText: `Cita de ${paciente.nombre} movida` })).toBeVisible();
  await expect(cita).toContainText(horaNueva);
  await expect(destinos).toHaveCount(0); // el modo se cierra solo
});
