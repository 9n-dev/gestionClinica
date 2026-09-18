import { expect, type Page } from "@playwright/test";

export const DEMO = { recepcion: "demo@podologiaserrano.es", admin: "admin@podologiaserrano.es", password: "demo1234" };

export async function entrar(page: Page, email: string, password: string) {
  await page.goto("/panel/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar en el panel" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda/);
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
