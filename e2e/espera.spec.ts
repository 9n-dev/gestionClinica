import { expect, test } from "@playwright/test";
import { abrirFicha, DEMO, entrar } from "./ayudas";

test("al cancelarse una cita, el panel propone a quien espera ese hueco y darle la cita lo saca de la lista", async ({ page }) => {
  await entrar(page, DEMO.recepcion, DEMO.password);
  const dia = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 35 + ((8 - d.getDay()) % 7)); return d.toISOString().slice(0, 10); }); // un lunes lejano y libre

  // Alguien que espera una consulta (30 min) con quien sea
  const nuevaCita = async (nombre: string, telefono: string, servicio: string, hora: string) => {
    await page.goto(`/panel/citas/nueva?profesional=marcos-ortiz&servicio=${servicio}&dia=${dia}&hora=${hora}`);
    await page.getByLabel("Nombre y apellidos del paciente").fill(nombre);
    await page.getByLabel("Teléfono").fill(telefono);
    await page.getByRole("button", { name: "Crear la cita" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Cita creada" })).toBeVisible();
  };
  await nuevaCita("Esperanza Espera Gil", "622000111", "consulta-general", "17:00");
  await abrirFicha(page, "esperanza espera", "Esperanza Espera Gil");
  await page.getByText("Apuntar en la lista de espera").click();
  await page.getByLabel("Para qué servicio").selectOption({ label: "Consulta general" });
  await page.getByLabel("Cuándo le viene bien").fill("Por la mañana, cuanto antes");
  await page.getByRole("button", { name: "Apuntar", exact: true }).click();
  await expect(page.getByText("Apuntado en la lista de espera")).toBeVisible();

  // Otra persona tiene una quiropodia (45 min) por la mañana… y la cancela
  await nuevaCita("Carlos Cancela Ruiz", "622000222", "quiropodia", "10:00");
  await page.getByText("Cancelar la cita", { exact: true }).click();
  await page.getByRole("button", { name: "Sí, cancelar la cita" }).click();

  const propuesta = page.getByRole("region", { name: "En lista de espera para este hueco" });
  await expect(propuesta.getByText("Esperanza Espera Gil")).toBeVisible();
  await expect(propuesta.getByText("Por la mañana, cuanto antes")).toBeVisible();

  // Se le da: el formulario llega con paciente, servicio, día y hora puestos
  await propuesta.getByRole("listitem").filter({ hasText: "Esperanza Espera Gil" }).getByRole("link", { name: "Darle esta cita" }).click(); // la demo ya trae a otros dos esperando, que llegaron antes
  await expect(page.getByLabel("Nombre y apellidos del paciente")).toHaveValue("Esperanza Espera Gil");
  await expect(page.getByLabel("Hora")).toHaveValue("10:00");
  await page.getByRole("button", { name: "Crear la cita" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cita creada" })).toBeVisible();

  await page.getByRole("link", { name: "Lista de espera" }).click();
  await expect(page.getByText("Esperanza Espera Gil")).toHaveCount(0);
});
