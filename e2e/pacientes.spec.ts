import { expect, test } from "@playwright/test";
import { abrirFicha, DEMO, entrar } from "./ayudas";

test("alta de un paciente sin cita y fusión de dos fichas de la misma persona", async ({ page }) => {
  await entrar(page, DEMO.recepcion, DEMO.password);
  const alta = async (nombre: string, telefono: string) => {
    await page.goto("/panel/pacientes");
    await page.getByText("Nuevo paciente sin cita").click();
    await page.getByLabel("Nombre y apellidos").fill(nombre);
    await page.getByLabel("Teléfono", { exact: true }).fill(telefono);
    await page.getByRole("button", { name: "Crear la ficha" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(nombre);
  };
  await alta("Pepe Doble Ficha", "688 000 111");
  await alta("José Doble Ficha López", "688000111"); // mismo móvil, otro nombre

  // La segunda ficha avisa de la primera y la absorbe
  const aviso = page.getByRole("region", { name: "¿Es la misma persona?" });
  await expect(aviso.getByRole("link", { name: "Pepe Doble Ficha" })).toBeVisible();
  await aviso.getByText("Fusionar en esta ficha").click();
  await aviso.getByRole("button", { name: /es la misma persona/ }).click();
  await expect(aviso).toHaveCount(0);

  await page.goto("/panel/pacientes?q=688000111");
  await expect(page.getByRole("link", { name: /Doble Ficha/ })).toHaveCount(1);
  await abrirFicha(page, "688000111", "José Doble Ficha López");
});
