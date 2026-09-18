import { expect, test } from "@playwright/test";
import { DEMO, entrar, irAGestion, salir } from "./ayudas";

test("administración ve los números del mes, con su tabla equivalente; el equipo no entra", async ({ page }) => {
  await entrar(page, DEMO.admin, DEMO.password);
  await irAGestion(page, "Estadísticas");
  await expect(page.getByRole("heading", { name: "Estadísticas" })).toBeVisible();

  // El seed deja citas atendidas este mes y en los dos anteriores: hay ingresos y con qué compararlos
  const ingresos = page.locator("dl > div").filter({ hasText: "Ingresos" });
  await expect(ingresos.locator("dd > span").first()).toHaveText(/^[1-9][\d.]*\s€$/);
  await expect(ingresos).toContainText(/respecto a|Igual que/);
  await expect(page.getByRole("meter", { name: "Ocupación de la agenda" })).toBeVisible();

  // Cada gráfico tiene su tabla: seis meses en la de tendencia
  const tendencia = page.getByRole("region", { name: "Ingresos de los últimos seis meses" });
  await tendencia.getByText("Ver como tabla").click();
  await expect(tendencia.getByRole("row")).toHaveCount(7);

  // El mes anterior se abre con el filtro
  await page.getByRole("link", { name: "Mes anterior" }).click();
  await expect(page.getByRole("link", { name: "Mes siguiente" })).toBeVisible();

  await salir(page);
  await entrar(page, DEMO.recepcion, DEMO.password);
  await expect(page.locator("summary", { hasText: "Gestión" })).toHaveCount(0);
  await page.goto("/panel/estadisticas");
  await expect(page).toHaveURL(/\/panel\/agenda/);
});
