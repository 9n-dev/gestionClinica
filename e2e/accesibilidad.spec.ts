import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { DEMO, entrar } from "./ayudas";

// axe-core en las pantallas principales, con las reglas WCAG 2.1 A y AA. Encuentra lo que se puede medir (contraste,
// nombres accesibles, etiquetas, ARIA, estructura); lo que no se mide, como que el orden del foco tenga sentido, se
// revisa a mano.
async function sinInfracciones(page: Page, ruta: string, antes?: () => Promise<unknown>) {
  await page.goto(ruta);
  await antes?.();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const resumen = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.slice(0, 3).map((n) => `   ${n.target.join(" ")}\n   ${n.failureSummary?.split("\n").slice(1, 2).join(" ").trim()}`).join("\n")}`);
  expect(resumen, `${ruta}\n${resumen.join("\n")}`).toEqual([]);
}

test("la web pública y la reserva no tienen infracciones de accesibilidad medibles", async ({ page }) => {
  for (const ruta of ["/", "/servicios", "/equipo", "/contacto", "/reservar", "/reservar?servicio=quiropodia", "/reservar?servicio=quiropodia&profesional=cualquiera", "/legal/privacidad", "/panel/login"]) await sinInfracciones(page, ruta);
  // El último paso, con el formulario de datos
  await page.goto("/reservar?servicio=quiropodia&profesional=cualquiera");
  await page.getByRole("link", { name: "Semana siguiente" }).click();
  await page.getByRole("link", { name: /^\d{2}:\d{2}$/ }).first().click();
  await expect(page.getByLabel("Nombre y apellidos")).toBeVisible();
  await sinInfracciones(page, page.url());
});

test("el panel tampoco, con los desplegables abiertos y el modo de mover citas activo", async ({ page }) => {
  await entrar(page, DEMO.admin, DEMO.password);
  for (const ruta of ["/panel/agenda?vista=semana&profesional=todos", "/panel/pacientes", "/panel/espera", "/panel/caja", "/panel/bloqueos", "/panel/citas/nueva", "/panel/emails", "/panel/actividad", "/panel/configuracion", "/panel/usuarios", "/panel/pacientes/importar", "/panel/cuenta"]) await sinInfracciones(page, ruta);
  await sinInfracciones(page, "/panel/estadisticas", () => page.locator("summary", { hasText: "Gestión" }).click());
  await sinInfracciones(page, "/panel/agenda?vista=dia&profesional=todos", async () => {
    await page.getByRole("button", { name: "Mover una cita" }).click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400); // los botones cambian de color con una transición: a mitad de camino axe mide un contraste que nadie llega a ver
  });

  await page.goto("/panel/pacientes");
  await page.locator("tbody a").first().click();
  await page.waitForURL(/\/panel\/pacientes\/./);
  await sinInfracciones(page, page.url());
  await page.getByRole("region", { name: "Historial" }).getByRole("link").first().click();
  await page.waitForURL(/\/panel\/citas\/./);
  await sinInfracciones(page, page.url());
});
