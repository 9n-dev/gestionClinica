import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { abrirFicha, DEMO, entrar, reservarPorLaWeb, salir } from "./ayudas";

const paciente = { nombre: "Borja Olvido Sanz", telefono: "698 765 432", email: "borja@paciente.test" };

test("recepción descarga los datos de un paciente; administración los elimina; todo queda en el registro de actividad", async ({ page }) => {
  await reservarPorLaWeb(page, paciente);

  // Derecho de acceso: cualquiera del equipo puede dar la copia. Eliminar, solo administración.
  await entrar(page, DEMO.recepcion, DEMO.password);
  await abrirFicha(page, "borja", paciente.nombre);
  await expect(page.getByText("Eliminar sus datos", { exact: true })).toHaveCount(0);
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar sus datos (JSON)" }).click();
  const datos = JSON.parse(readFileSync((await (await descarga).path())!, "utf8"));
  expect(datos.paciente).toMatchObject({ nombre: paciente.nombre, telefono: "698765432", email: paciente.email });
  expect(datos.citas).toHaveLength(1);
  expect(datos.citas[0]).toMatchObject({ servicio: "Quiropodia", estado: "CONFIRMADA" });
  await salir(page);

  // Derecho de supresión: con una cita pendiente no deja
  await entrar(page, DEMO.admin, DEMO.password);
  await abrirFicha(page, "borja", paciente.nombre);
  const ficha = page.url();
  await page.getByText("Eliminar sus datos", { exact: true }).click();
  await page.getByRole("button", { name: "Sí, eliminar sus datos" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Tiene una cita pendiente" })).toBeVisible();

  await page.getByRole("region", { name: "Próximas citas" }).getByRole("link").last().click();
  await page.getByText("Cancelar la cita", { exact: true }).click();
  await page.getByRole("button", { name: "Sí, cancelar la cita" }).click();
  await expect(page.getByText("Cancelada", { exact: true }).first()).toBeVisible();

  await page.goto(ficha);
  await page.getByText("Eliminar sus datos", { exact: true }).click();
  await page.getByRole("button", { name: "Sí, eliminar sus datos" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paciente eliminado");
  await expect(page.getByText("Sus datos se eliminaron")).toBeVisible();
  await expect(page.getByRole("region", { name: "Historial" }).getByText("Quiropodia")).toBeVisible(); // la cita se queda
  await expect(page.getByText(/Borja|698765432|borja@/)).toHaveCount(0);

  // Ya no sale en la lista ni en la búsqueda
  await page.goto("/panel/pacientes?q=borja");
  await expect(page.getByText("Ningún paciente coincide")).toBeVisible();

  // El registro de esa ficha: quién la abrió, quién la descargó y quién la eliminó, sin datos del paciente
  await page.goto(ficha);
  await page.getByRole("link", { name: "Quién ha abierto o cambiado esta ficha" }).click();
  const fila = (quien: string, que: string | RegExp) => page.getByRole("row").filter({ hasText: quien }).filter({ hasText: que });
  await expect(fila(DEMO.recepcion, "Abrió")).toHaveCount(1); // una vez, aunque la página se pintara varias
  await expect(fila(DEMO.recepcion, "Descargó los datos")).toHaveCount(1);
  await expect(fila(DEMO.admin, /Borró.*supresión/)).toHaveCount(1);
  await expect(page.getByText(/Borja/)).toHaveCount(0);

  // Y en el registro general: pasar por la lista de pacientes no cuenta como abrir sus fichas
  await page.goto(`/panel/actividad?entidad=paciente&usuario=${DEMO.recepcion}`);
  // La lista tiene 30 pacientes: si enlazarlos contara como abrirlos, aquí habría decenas. Solo están las fichas que de verdad
  // ha abierto recepción, una a una, en estos tests.
  await expect(page.getByRole("row").filter({ hasText: "Abrió" }).first()).toBeVisible();
  expect(await page.getByRole("row").filter({ hasText: "Abrió" }).count()).toBeLessThan(20); // otros tests abren alguna ficha más; 30 de golpe sería el fallo
});
