import { expect, test } from "@playwright/test";
import { abrirCuenta, DEMO, enlaceDelEmail, entrar, irAGestion, salir } from "./ayudas";

test("administración da de alta a alguien del equipo, que elige su contraseña y entra sin permisos de administración", async ({ page, browser }) => {
  const eva = { nombre: "Eva Prueba", email: "eva@clinica.test", password: "una frase larga y fácil" };

  await entrar(page, DEMO.admin, DEMO.password);
  await irAGestion(page, "Usuarios");
  const alta = page.locator("form").filter({ hasText: "Crear usuario" });
  await alta.getByLabel("Nombre").fill(eva.nombre);
  await alta.getByLabel("Email").fill(eva.email);
  await alta.getByRole("button", { name: /Crear usuario/ }).click();
  await expect(alta.getByRole("status")).toContainText("Usuario creado");
  await expect(page.getByText("Tiene un enlace pendiente")).toBeVisible();

  // El enlace solo viaja en el email
  const enlace = await enlaceDelEmail(page, "Tu acceso al panel", /http[^"<\s]+\/panel\/acceso\/[\w-]+/);
  await salir(page);

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
  await expect(page.locator("summary", { hasText: "Gestión" })).toHaveCount(0);
  await page.goto("/panel/usuarios");
  await expect(page).toHaveURL(/\/panel\/agenda/);

  // Cambia la contraseña desde «Mi cuenta» con otra sesión suya abierta en otro navegador: caen las dos
  const otro = await browser.newContext();
  const otraPagina = await otro.newPage();
  await entrar(otraPagina, eva.email, eva.password);

  const nueva = "otra frase todavía más larga";
  await abrirCuenta(page);
  await page.getByRole("link", { name: "Mi cuenta" }).click();
  await page.getByLabel("Contraseña actual").fill("no es esta");
  await page.getByLabel("Contraseña nueva").fill(nueva);
  await page.getByLabel("Repítela").fill(nueva);
  await page.getByRole("button", { name: "Cambiar la contraseña" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "La contraseña actual no es esa" })).toBeVisible();
  await page.getByLabel("Contraseña actual").fill(eva.password);
  await page.getByLabel("Contraseña nueva").fill(nueva);
  await page.getByLabel("Repítela").fill(nueva);
  await page.getByRole("button", { name: "Cambiar la contraseña" }).click();
  await expect(page).toHaveURL(/\/panel\/login/);

  await otraPagina.goto("/panel/pacientes");
  await expect(otraPagina).toHaveURL(/\/panel\/login/); // la sesión del otro navegador ya no vale
  await otro.close();

  await page.getByLabel("Email").fill(eva.email);
  await page.getByLabel("Contraseña").fill(eva.password);
  await page.getByRole("button", { name: "Entrar en el panel" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "incorrectos" })).toBeVisible();
  await entrar(page, eva.email, nueva);
});

test("los usuarios de la demo no se pueden cambiar ni recuperar", async ({ page }) => {
  await entrar(page, DEMO.admin, DEMO.password);
  await page.goto("/panel/usuarios");
  const recepcion = page.locator("form").filter({ has: page.locator(`input[value="${DEMO.recepcion}"]`) });
  await expect(recepcion.getByText("no se puede cambiar ni borrar")).toBeVisible();
  await expect(recepcion.getByRole("button")).toHaveCount(0);

  // Pedir la recuperación responde lo mismo que con un email que no existe, y no sale ningún email
  await salir(page);
  await page.goto("/panel/recuperar");
  await page.getByLabel("Email").fill(DEMO.recepcion);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("status")).toContainText("Si ese email tiene usuario");
  await entrar(page, DEMO.recepcion, DEMO.password);
  await page.goto("/panel/emails");
  await expect(page.getByText("Cambia tu contraseña del panel")).toHaveCount(0);
});
