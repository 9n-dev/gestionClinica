// Capturas de todas las pantallas: para la documentación (docs/capturas) y para repasar la interfaz de un vistazo.
//   npm run seed && npm run dev            (en otra terminal, con MODO_DEMO=1)
//   node scripts/capturas.mjs [carpeta] [url] [solo]
//     carpeta  por defecto docs/capturas
//     url      por defecto http://localhost:3000
//     solo     repetir únicamente las capturas cuyo nombre lo contenga
// Hace una reserva de prueba por la web (paciente «Marina Ejemplo»): después, `npm run seed` deja la demo como estaba.
import { mkdirSync, rmSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp"; // viene con Next

const [, , carpeta = "docs/capturas", base = "http://localhost:3000", solo = ""] = process.argv;
mkdirSync(carpeta, { recursive: true });
const navegador = await chromium.launch();
const ANCHO_FINAL = 1200;

async function sesion(ancho, alto, tactil = false) {
  const contexto = await navegador.newContext({ viewport: { width: ancho, height: alto }, locale: "es-ES", timezoneId: "Europe/Madrid", hasTouch: tactil, deviceScaleFactor: 1 });
  // Fuera lo que no es de la app: el indicador del modo desarrollo de Next y, rechazándolo una vez, el aviso de cookies.
  await contexto.addInitScript(() => addEventListener("DOMContentLoaded", () => document.head.append(Object.assign(document.createElement("style"), { textContent: "nextjs-portal{display:none!important}" }))));
  const pagina = await contexto.newPage();
  await pagina.goto(base);
  await pagina.getByRole("button", { name: "Rechazar" }).click().catch(() => {});

  /** Captura la página actual (o `ruta`), sin el aviso de demo de arriba, recortada a `altoMax` y optimizada. Devuelve el PNG. */
  const captura = async (nombre, ruta, antes, altoMax = 1000) => {
    if (solo && !nombre.includes(solo)) return null;
    if (ruta) await pagina.goto(base + ruta, { waitUntil: "networkidle" });
    if (antes) await antes(pagina);
    const aviso = await pagina.evaluate(() => document.querySelector('[role="note"]')?.getBoundingClientRect().height ?? 0);
    const entera = sharp(await pagina.screenshot({ fullPage: true }));
    const { height } = await entera.metadata();
    const recorte = entera.extract({ left: 0, top: Math.round(aviso), width: ancho, height: Math.min(height - Math.round(aviso), altoMax) });
    const png = await (ancho > ANCHO_FINAL ? recorte.resize({ width: ANCHO_FINAL }) : recorte).png({ palette: true, colors: 128, dither: 0 }).toBuffer();
    await sharp(png).toFile(`${carpeta}/${nombre}.png`);
    console.log(nombre);
    return png;
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

// ---------- La web y la reserva, como las ve el paciente ----------
const e = await sesion(1440, 900);
await e.captura("web-inicio", "/");
await e.captura("web-servicios", "/servicios");
await e.captura("web-equipo", "/equipo");
await e.captura("web-contacto", "/contacto");
await e.captura("web-reservar-1-servicio", "/reservar");
await e.captura("web-reservar-2-profesional", "/reservar?servicio=quiropodia");
await e.captura("web-reservar-3-dia-y-hora", "/reservar?servicio=quiropodia&profesional=cualquiera");
if (!solo || "web-reservar-4-datos web-cita-confirmada web-cita-cancelar".includes(solo)) {
  await e.pagina.goto(`${base}/reservar?servicio=quiropodia&profesional=cualquiera`);
  await e.pagina.getByRole("link", { name: "Semana siguiente" }).click();
  await e.pagina.getByRole("link", { name: /^\d{2}:\d{2}$/ }).first().click();
  await e.pagina.getByLabel("Nombre y apellidos").fill("Marina Ejemplo Ruiz");
  await e.pagina.getByLabel("Teléfono móvil").fill("612 345 678");
  await e.pagina.getByLabel("Email").fill("marina@ejemplo.com");
  await e.pagina.getByRole("checkbox").check();
  await e.captura("web-reservar-4-datos");
  await e.pagina.getByRole("button", { name: "Confirmar cita" }).click();
  await e.pagina.waitForURL(/\/cita\//);
  await e.captura("web-cita-confirmada");
  await e.captura("web-cita-cancelar", null, (p) => p.getByText("No puedo ir").click());
}

// ---------- El panel ----------
await e.captura("panel-login", "/panel/login");
await e.entrar("admin@podologiaserrano.es");
const semanaQueViene = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10); // el seed empieza hoy: la semana en curso sale medio vacía
await e.captura("panel-agenda-semana", `/panel/agenda?vista=semana&profesional=todos&fecha=${semanaQueViene}`);
await e.captura("panel-agenda-moviendo", `/panel/agenda?vista=dia&profesional=todos&fecha=${semanaQueViene}`, async (p) => {
  await p.getByRole("button", { name: "Mover una cita" }).click();
  const cita = p.locator('button[aria-pressed="false"]:not([disabled])').first();
  if (await cita.count()) await cita.click();
});
await e.captura("panel-menu-gestion", "/panel/agenda", (p) => p.locator("summary", { hasText: "Gestión" }).click(), 520);
await e.captura("panel-cita-nueva", "/panel/citas/nueva");
await e.captura("panel-pacientes", "/panel/pacientes");
if (!solo || "panel-ficha-paciente panel-cita".includes(solo)) {
  await e.pagina.goto(`${base}/panel/pacientes`);
  await e.pagina.locator("tbody a").first().click();
  await e.pagina.waitForURL(/pacientes\/./);
  await e.captura("panel-ficha-paciente", null, null, 1500);
  await e.pagina.getByRole("region", { name: "Historial" }).getByRole("link").first().click();
  await e.pagina.waitForURL(/citas\/./);
  await e.captura("panel-cita", null, null, 1300);
}
await e.captura("panel-lista-de-espera", "/panel/espera");
await e.captura("panel-caja", "/panel/caja");
await e.captura("panel-bloqueos", "/panel/bloqueos");
await e.captura("panel-emails-y-mensajes", "/panel/emails", (p) => p.locator("main details").first().click(), 1200);
await e.captura("panel-estadisticas", "/panel/estadisticas", null, 1400);
await e.captura("panel-actividad", "/panel/actividad");
await e.captura("panel-configuracion", "/panel/configuracion", null, 1500);
await e.captura("panel-usuarios", "/panel/usuarios", null, 1200);
await e.captura("panel-importar", "/panel/pacientes/importar");
await e.captura("panel-cuenta", "/panel/cuenta");

// ---------- Móvil y tablet ----------
const m = await sesion(390, 844, true);
const movil = [await m.captura("movil-inicio", "/", null, 800), await m.captura("movil-reservar", "/reservar?servicio=quiropodia&profesional=cualquiera", null, 800)];
await m.entrar("demo@podologiaserrano.es");
movil.push(await m.captura("movil-agenda", "/panel/agenda?vista=dia", null, 800));
movil.push(await m.captura("movil-menu", "/panel/pacientes", (p) => p.locator("summary", { hasText: "Menú" }).click(), 800));
if (movil.every(Boolean)) {
  // Las cuatro, en una tira
  const hueco = 30;
  await sharp({ create: { width: 390 * 4 + hueco * 3, height: 800, channels: 3, background: "#ffffff" } })
    .composite(movil.map((input, i) => ({ input, left: i * (390 + hueco), top: 0 })))
    .png({ palette: true, colors: 128, dither: 0 })
    .toFile(`${carpeta}/movil.png`);
  for (const n of ["inicio", "reservar", "agenda", "menu"]) rmSync(`${carpeta}/movil-${n}.png`, { force: true }); // solo se usa la tira
  console.log("movil (tira)");
}
const t = await sesion(1024, 768, true);
await t.entrar("demo@podologiaserrano.es");
await t.captura("tablet-agenda", `/panel/agenda?vista=semana&profesional=todos&fecha=${semanaQueViene}`, null, 760);

await navegador.close();
