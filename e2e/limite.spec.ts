import { expect, test } from "@playwright/test";
import { DEMO } from "./ayudas";

// IP propia (rango de documentación) para no gastar el cupo de los demás tests, que salen todos de la misma máquina.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.7" } });

test("a los 10 fallos de contraseña, el login se cierra para esa conexión aunque luego se acierte", async ({ page }) => {
  await page.goto("/panel/login");
  const probar = async (password: string) => {
    await page.getByLabel("Email").fill(DEMO.recepcion);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Entrar en el panel" }).click();
  };
  for (let i = 1; i <= 10; i++) {
    await probar(`mala-${i}`);
    await expect(page.getByRole("alert").filter({ hasText: "Email o contraseña incorrectos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar en el panel" })).toBeEnabled();
  }
  await probar(DEMO.password);
  await expect(page.getByRole("alert").filter({ hasText: "Demasiados intentos" })).toBeVisible();
  await expect(page).toHaveURL(/\/panel\/login/);
});
