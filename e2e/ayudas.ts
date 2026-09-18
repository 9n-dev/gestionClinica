import { expect, type Page } from "@playwright/test";

export const DEMO = { recepcion: "demo@podologiaserrano.es", admin: "admin@podologiaserrano.es", password: "demo1234" };

export async function entrar(page: Page, email: string, password: string) {
  await page.goto("/panel/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar en el panel" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda/);
}

export type PacienteE2E = { nombre: string; telefono: string; email: string };

/** Reserva pública completa: servicio → profesional → día y hora → datos. Acaba en la página de «Cita confirmada». */
export async function reservarPorLaWeb(page: Page, paciente: PacienteE2E) {
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
}

export async function abrirFicha(page: Page, busqueda: string, nombre: string) {
  await page.goto("/panel/pacientes");
  await page.getByLabel("Buscar por nombre o teléfono").fill(busqueda);
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("link", { name: nombre }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(nombre);
}

/** Abre «Emails enviados» (hay que tener sesión) y devuelve el primer enlace del email más reciente con ese asunto. */
export async function enlaceDelEmail(page: Page, asunto: string | RegExp, enlace: RegExp) {
  await page.goto("/panel/emails");
  const email = page.locator("details").filter({ hasText: asunto }).first();
  const html = await email.locator("iframe").getAttribute("srcdoc");
  const url = html?.match(enlace)?.[0];
  if (!url) throw new Error(`No hay ningún email «${asunto}» con un enlace ${enlace}`);
  return new URL(url).pathname;
}
