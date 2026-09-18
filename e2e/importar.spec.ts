import { expect, test, type Page } from "@playwright/test";
import { abrirFicha, DEMO, entrar } from "./ayudas";

// Como lo guarda el Excel español: punto y coma y Windows-1252 (latin1 coincide en estas letras).
const CSV = Buffer.from(
  ["Apellidos;Nombre;Móvil;Correo;Observaciones", "Zúñiga Peña;Íñigo;+34 655 000 111;INIGO@correo.test;Prefiere tardes", "Oñate;Begoña;655000222;;", "Sin Teléfono;Pepe;;;", "Zúñiga Peña;íñigo;655000111;;repetida"].join("\r\n"),
  "latin1",
);
const subir = async (page: Page) => {
  await page.goto("/panel/pacientes/importar");
  await page.getByLabel("Fichero CSV").setInputFiles({ name: "pacientes.csv", mimeType: "text/csv", buffer: CSV });
  await page.getByRole("button", { name: "Comprobar el fichero" }).click();
};

test("administración importa la cartera desde un CSV de Excel: comprueba, confirma y no duplica al repetir", async ({ page }) => {
  await entrar(page, DEMO.admin, DEMO.password);
  await page.getByRole("link", { name: "Pacientes" }).click();
  await page.getByRole("link", { name: "Importar pacientes" }).click();

  await subir(page);
  const resultado = page.getByRole("region", { name: "Resultado de la comprobación" });
  await expect(resultado).toContainText("2 pacientes listos");
  await expect(resultado).toContainText("1 fila repetida");
  await expect(resultado.getByRole("row").filter({ hasText: "Pepe Sin Teléfono" })).toContainText("teléfono español de 9 cifras");
  await expect(page.getByText("Íñigo Zúñiga Peña")).toBeVisible(); // tildes y eñes bien leídas

  await page.getByRole("button", { name: "Importar 2 pacientes" }).click();
  await expect(page.getByRole("status")).toContainText("2 pacientes importados");

  await abrirFicha(page, "inigo zuniga", "Íñigo Zúñiga Peña");
  await expect(page.getByLabel("Teléfono")).toHaveValue("655000111");
  await expect(page.getByLabel("Email (opcional)")).toHaveValue("inigo@correo.test");
  await expect(page.getByLabel("Notas internas")).toHaveValue("Prefiere tardes");

  // Subir el mismo fichero otra vez no crea nada
  await subir(page);
  await page.getByRole("button", { name: "Importar 2 pacientes" }).click();
  await expect(page.getByRole("status")).toContainText("0 pacientes importados");
  await expect(page.getByRole("status")).toContainText("2 ya existían");
});
