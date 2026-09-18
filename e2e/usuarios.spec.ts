import { expect, test } from "@playwright/test";
import { DEMO, enlaceDelEmail, entrar } from "./ayudas";

test("administración da de alta a alguien del equipo, que elige su contraseña y entra sin permisos de administración", async ({ page }) => {
  const eva = { nombre: "Eva Prueba", email: "eva@clinica.test", password: "una frase larga y fácil" };

  await entrar(page, DEMO.admin, DEMO.password);
  await page.getByRole("link", { name: "Usuarios" }).click();
  const alta = page.locator("form").filter({ hasText: "Crear usuario" });
  await alta.getByLabel("Nombre").fill(eva.nombre);
  await alta.getByLabel("Email").fill(eva.email);
  await alta.getByRole("button", { name: /Crear usuario/ }).click();
  await expect(alta.getByRole("status")).toContainText("Usuario creado");
  await expect(page.getByText("Tiene un enlace pendiente")).toBeVisible();

  // El enlace solo viaja en el email
  const enlace = await enlaceDelEmail(page, "Tu acceso al panel", /http[^"<\s]+\/panel\/acceso\/[\w-]+/);
  await page.getByRole("button", { name: /Salir/ }).click();

  await page.goto(enlace);
  await expect(page.getByText(eva.email)).toBeVisible();
  await page.getByLabel("Contraseña nueva").fill(eva.password);
  await page.getByLabel("Repítela").fill("otra cosa distinta");
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "no coinciden" })).toBeVisible();
  await page.getByLabel("Contraseña nueva").fill(eva.password);
  await page.getByLabel("Repítela").fill(eva.password);
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();
  await expect(page.getByText("Contraseña guardada")).toBeVisible();

  // El enlace era de un solo uso
  await page.goto(enlace);
  await expect(page.getByText("ha caducado o ya se ha usado")).toBeVisible();

  // Entra como Equipo: ni ve ni puede abrir lo de administración
  await entrar(page, eva.email, eva.password);
  await expect(page.getByRole("link", { name: "Pacientes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Configuración" })).toHaveCount(0);
  await page.goto("/panel/usuarios");
  await expect(page).toHaveURL(/\/panel\/agenda/);
});

test("los usuarios de la demo no se pueden cambiar ni recuperar", async ({ page }) => {
  await entrar(page, DEMO.admin, DEMO.password);
  await page.goto("/panel/usuarios");
  const recepcion = page.locator("form").filter({ has: page.locator(`input[value="${DEMO.recepcion}"]`) });
  await expect(recepcion.getByText("no se puede cambiar ni borrar")).toBeVisible();
  await expect(recepcion.getByRole("button")).toHaveCount(0);

  // Pedir la recuperación responde lo mismo que con un email que no existe, y no sale ningún email
  await page.getByRole("button", { name: /Salir/ }).click();
  await page.goto("/panel/recuperar");
  await page.getByLabel("Email").fill(DEMO.recepcion);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("status")).toContainText("Si ese email tiene usuario");
  await entrar(page, DEMO.recepcion, DEMO.password);
  await page.goto("/panel/emails");
  await expect(page.getByText("Cambia tu contraseña del panel")).toHaveCount(0);
});
