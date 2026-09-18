import { expect, test } from "@playwright/test";
import { abrirFicha, DEMO, enlaceDelEmail, entrar, reservarPorLaWeb } from "./ayudas";

test("un paciente reserva por la web, la clínica lo ve en su ficha y el paciente cancela desde el email", async ({ page }) => {
  const paciente = { nombre: "Noelia Prueba Díaz", telefono: "612 345 678", email: "noelia@paciente.test" };

  // 1. Reserva pública: servicio → profesional → día y hora → datos
  await reservarPorLaWeb(page, paciente);

  // 2. La clínica: el paciente se ha creado solo y tiene la cita en su ficha
  await entrar(page, DEMO.recepcion, DEMO.password);
  await abrirFicha(page, "noelia prueba diaz", paciente.nombre); // se encuentra sin acentos ni mayúsculas
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
