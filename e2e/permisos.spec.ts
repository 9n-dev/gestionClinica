import { expect, test } from "@playwright/test";
import { abrirFicha, DEMO, entrar, reservarPorLaWeb } from "./ayudas";

test("un profesional ve la agenda de todos pero solo modifica lo suyo", async ({ page }) => {
  const paciente = { nombre: "Paula Ajena Ríos", telefono: "644 555 666", email: "paula@paciente.test" };
  await reservarPorLaWeb(page, paciente); // la cita es con la Dra. Serrano

  await entrar(page, "marcos@podologiaserrano.es", DEMO.password);
  await abrirFicha(page, "paula ajena", paciente.nombre);
  await page.getByRole("region", { name: "Próximas citas" }).getByRole("link").last().click();
  await expect(page.getByText("Esta cita es de Dra. Laura Serrano")).toBeVisible();
  for (const boton of ["Marcar como atendida", "No se presentó", "Mover la cita", "Guardar notas"]) await expect(page.getByRole("button", { name: boton })).toHaveCount(0);

  // En su agenda, esa cita no se puede mover
  await page.getByRole("link", { name: "Volver a la agenda de ese día" }).click();
  await page.waitForURL(/\/panel\/agenda/);
  const fecha = new URL(page.url()).searchParams.get("fecha");
  await page.goto(`/panel/agenda?vista=dia&fecha=${fecha}&profesional=todos`); // su agenda se abre filtrada por su columna
  await page.getByRole("button", { name: "Mover una cita" }).click();
  await page.getByRole("link", { name: new RegExp(paciente.nombre) }).click();
  await expect(page.getByRole("button", { name: /^Mover a las/ })).toHaveCount(0);

  // Solo puede dar citas y bloquear horas en su columna, y no bloquear toda la clínica
  await page.goto("/panel/citas/nueva");
  await expect(page.getByLabel("Profesional").getByRole("option")).toHaveText(["Dr. Marcos Ortiz"]);
  await page.goto("/panel/bloqueos");
  await expect(page.getByLabel("A quién afecta").getByRole("option")).toHaveText(["Dr. Marcos Ortiz"]);

  // Recepción, que no está ligada a nadie, sí gestiona esa cita
  await page.getByRole("button", { name: /Salir/ }).click();
  await entrar(page, DEMO.recepcion, DEMO.password);
  await abrirFicha(page, "paula ajena", paciente.nombre);
  await page.getByRole("region", { name: "Próximas citas" }).getByRole("link").last().click();
  await expect(page.getByRole("button", { name: "Marcar como atendida" })).toBeVisible();
});
