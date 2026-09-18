import { expect, test } from "@playwright/test";
import { DEMO, enlaceDelEmail, entrar } from "./ayudas";

test("un paciente reserva por la web, la clínica lo ve en su ficha y el paciente cancela desde el email", async ({ page }) => {
  const paciente = { nombre: "Noelia Prueba Díaz", telefono: "612 345 678", email: "noelia@paciente.test" };

  // 1. Reserva pública: servicio → profesional → día y hora → datos
  await page.goto("/reservar");
  await page.getByRole("link", { name: /Quiropodia/ }).click();
  await page.getByRole("link", { name: /Laura Serrano/ }).click();
  await page.getByRole("link", { name: "Semana siguiente" }).click(); // la semana que viene siempre tiene huecos, sea cual sea el día de hoy
  await page.getByRole("link", { name: /^\d{2}:\d{2}$/ }).first().click();
  await page.getByLabel("Nombre y apellidos").fill(paciente.nombre);
  await page.getByLabel("Teléfono móvil").fill(paciente.telefono);
  await page.getByLabel("Email").fill(paciente.email);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmar cita" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cita confirmada");

  // 2. La clínica: el paciente se ha creado solo y tiene la cita en su ficha
  await entrar(page, DEMO.recepcion, DEMO.password);
  await page.getByRole("link", { name: "Pacientes" }).click();
  await page.getByLabel("Buscar por nombre o teléfono").fill("noelia prueba diaz"); // sin acentos ni mayúsculas
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("link", { name: paciente.nombre }).click();
  const proximas = page.getByRole("region", { name: "Próximas citas" });
  await expect(proximas.getByText("Quiropodia")).toBeVisible();
  const ficha = page.url();

  // 3. El paciente cancela con el enlace de su email de confirmación
  const enlace = await enlaceDelEmail(page, paciente.email, /http[^"<\s]+\/cita\/[\w-]+/);
  await page.goto(enlace);
  await page.getByText("No puedo ir").click();
  await page.getByRole("button", { name: "Cancelar mi cita" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cita cancelada");

  // 4. Y en la ficha pasa al historial como cancelada
  await page.goto(ficha);
  await expect(page.getByRole("region", { name: "Historial" }).getByText("Cancelada")).toBeVisible();
  await expect(proximas.getByText("Quiropodia")).toHaveCount(0);
});
