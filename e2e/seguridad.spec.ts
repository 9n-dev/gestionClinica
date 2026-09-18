import { expect, test } from "@playwright/test";
import { DEMO, entrar } from "./ayudas";

test("todas las respuestas llevan las cabeceras de seguridad y la app funciona bajo su propia CSP", async ({ page, request }) => {
  for (const ruta of ["/", "/panel/login", "/api/cron/recordatorios"]) {
    const h = (await request.get(ruta)).headers();
    expect(h["content-security-policy"], ruta).toContain("frame-ancestors 'none'");
    expect(h["strict-transport-security"], ruta).toContain("max-age=");
    expect(h["x-content-type-options"], ruta).toBe("nosniff");
    expect(h["x-powered-by"], ruta).toBeUndefined();
  }

  // Lo que mira un monitor de disponibilidad, y los webhooks: sin firma no entra nadie
  expect(await (await request.get("/api/salud")).json()).toEqual({ ok: true });
  expect((await request.post("/api/resend/webhook", { data: { type: "email.bounced", data: { email_id: "x" } } })).status()).toBe(403);
  expect((await request.post("/api/twilio/estado", { form: { MessageSid: "SM1", MessageStatus: "failed" } })).status()).toBe(403);

  // Si la CSP bloqueara algo propio (scripts de Next, estilos, el correo en su iframe), el navegador lo diría en la consola
  const violaciones: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) violaciones.push(m.text()); });
  await page.goto("/contacto");
  await page.goto("/reservar");
  await entrar(page, DEMO.recepcion, DEMO.password);
  await page.getByRole("button", { name: "Mover una cita" }).click(); // componente de cliente: necesita sus scripts
  await expect(page.getByText("Toca la cita que quieres mover")).toBeVisible();
  await page.goto("/panel/emails");
  await page.locator("main details").first().click(); // el primer email, no los desplegables del menú
  await expect(page.locator("main iframe").first()).toBeVisible();
  expect(violaciones).toEqual([]);
});
