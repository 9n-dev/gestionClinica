// Capturas de todas las pantallas, para revisarlas de un vistazo y para el README.
//   npm run seed && npm run dev   (en otra terminal, con MODO_DEMO=1)
//   node scripts/capturas.mjs [carpeta] [url]        → por defecto docs/capturas y http://localhost:3000
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [, , carpeta = "docs/capturas", base = "http://localhost:3000"] = process.argv;
mkdirSync(carpeta, { recursive: true });
const navegador = await chromium.launch();

async function sesion(ancho, alto, tactil = false) {
  const pagina = await (await navegador.newContext({ viewport: { width: ancho, height: alto }, locale: "es-ES", timezoneId: "Europe/Madrid", hasTouch: tactil, deviceScaleFactor: 1 })).newPage();
  const captura = async (nombre, ruta, antes) => {
    if (ruta) await pagina.goto(base + ruta, { waitUntil: "networkidle" });
    if (antes) await antes(pagina);
    await pagina.screenshot({ path: `${carpeta}/${nombre}.png`, fullPage: true });
    console.log(nombre);
  };
  const entrar = async (email) => {
    await pagina.goto(`${base}/panel/login`);
    await pagina.getByLabel("Email").fill(email);
    await pagina.getByLabel("Contraseña").fill("demo1234"); // la de la demo, que está a la vista en esa misma página
    await pagina.getByRole("button", { name: "Entrar en el panel" }).click();
    await pagina.waitForURL(/agenda/);
  };
  return { pagina, captura, entrar };
}

// Escritorio
const e = await sesion(1440, 900);
await e.captura("web-inicio", "/");
await e.captura("web-servicios", "/servicios");
await e.captura("web-contacto", "/contacto");
await e.captura("web-reservar-1-servicio", "/reservar");
await e.captura("web-reservar-3-dia-y-hora", "/reservar?servicio=quiropodia&profesional=cualquiera");
await e.captura("panel-login", "/panel/login");
await e.entrar("admin@podologiaserrano.es");
await e.captura("panel-agenda-semana", "/panel/agenda?vista=semana&profesional=todos");
await e.captura("panel-agenda-dia-moviendo", "/panel/agenda?vista=dia&profesional=todos", async (p) => {
  await p.getByRole("button", { name: "Mover una cita" }).click();
  const cita = p.locator('button[aria-pressed="false"]:not([disabled])').last();
  if (await cita.count()) await cita.click();
});
await e.captura("panel-menu-gestion", "/panel/estadisticas", (p) => p.locator("summary", { hasText: "Gestión" }).click());
await e.captura("panel-estadisticas", "/panel/estadisticas");
await e.captura("panel-pacientes", "/panel/pacientes");
await e.pagina.locator("tbody a").first().click();
await e.pagina.waitForURL(/pacientes\/./);
await e.captura("panel-ficha-paciente");
await e.pagina.getByRole("region", { name: "Historial" }).getByRole("link").first().click();
await e.pagina.waitForURL(/citas\/./);
await e.captura("panel-cita");
await e.captura("panel-cita-nueva", "/panel/citas/nueva");
await e.captura("panel-lista-de-espera", "/panel/espera");
await e.captura("panel-caja", "/panel/caja");
await e.captura("panel-bloqueos", "/panel/bloqueos");
await e.captura("panel-emails-y-mensajes", "/panel/emails");
await e.captura("panel-actividad", "/panel/actividad");
await e.captura("panel-configuracion", "/panel/configuracion");
await e.captura("panel-usuarios", "/panel/usuarios");
await e.captura("panel-importar", "/panel/pacientes/importar");
await e.captura("panel-cuenta", "/panel/cuenta");

// Móvil y tablet
const m = await sesion(390, 844, true);
await m.captura("movil-inicio", "/");
await m.captura("movil-reservar", "/reservar?servicio=quiropodia&profesional=cualquiera");
await m.entrar("demo@podologiaserrano.es");
await m.captura("movil-agenda", "/panel/agenda?vista=dia");
await m.captura("movil-menu-cuenta", "/panel/pacientes", (p) => p.locator("summary", { hasText: "Cuenta de" }).click());
const t = await sesion(1024, 768, true);
await t.entrar("demo@podologiaserrano.es");
await t.captura("tablet-agenda-semana", "/panel/agenda?vista=semana&profesional=todos");

await navegador.close();
