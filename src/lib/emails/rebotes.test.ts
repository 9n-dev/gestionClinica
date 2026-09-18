import { createHmac } from "node:crypto";
import { rmSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const RUTA = `/tmp/podologia-test-rebotes-${process.pid}.db`;
process.env.DATABASE_URL = `file:${RUTA}`;
const { prisma } = await import("../db");
const { migrar } = await import("../migraciones");
const { firmaSvixValida, registrarEvento } = await import("./rebotes");

beforeAll(async () => void (await migrar()));
afterAll(async () => {
  await prisma.$disconnect();
  rmSync(RUTA, { force: true });
});

it("solo acepta lo que firma Resend, y no una petición vieja reenviada", () => {
  const clave = Buffer.from("clave-de-prueba");
  process.env.RESEND_WEBHOOK_SECRET = `whsec_${clave.toString("base64")}`;
  const ahora = Date.UTC(2026, 8, 18, 10);
  const cuerpo = '{"type":"email.bounced"}';
  const cabeceras = (c: string, t = ahora / 1000) =>
    new Headers({ "svix-id": "msg_1", "svix-timestamp": String(t), "svix-signature": `v1,otra-firma-antigua v1,${createHmac("sha256", clave).update(`msg_1.${t}.${c}`).digest("base64")}` });
  expect(firmaSvixValida(cabeceras(cuerpo), cuerpo, ahora)).toBe(true);
  expect(firmaSvixValida(cabeceras(cuerpo), '{"type":"email.delivered"}', ahora)).toBe(false); // cuerpo cambiado
  expect(firmaSvixValida(cabeceras(cuerpo, ahora / 1000 - 3600), cuerpo, ahora)).toBe(false); // de hace una hora
  expect(firmaSvixValida(new Headers(), cuerpo, ahora)).toBe(false);
  delete process.env.RESEND_WEBHOOK_SECRET;
  expect(firmaSvixValida(cabeceras(cuerpo), cuerpo, ahora)).toBe(false); // sin secreto configurado, nadie pasa
});

it("un rebote deja el email marcado como fallido; lo demás no toca nada", async () => {
  await prisma.emailEnviado.create({ data: { tipo: "RECORDATORIO", canal: "RESEND", para: "no-existe@correo.test", asunto: "a", html: "b", proveedorId: "re_123" } });
  expect(await registrarEvento({ type: "email.delivered", data: { email_id: "re_123" } })).toBe(0);
  expect(await registrarEvento({ type: "email.bounced", data: { email_id: "re_otro" } })).toBe(0);
  expect(await registrarEvento({ type: "email.bounced", data: { email_id: "re_123" } })).toBe(1);
  expect((await prisma.emailEnviado.findFirstOrThrow()).error).toContain("rebotado");
});

it("las alertas técnicas llegan por email, como mucho 10 a la hora, y sin destinatario solo van al log", async () => {
  const { vi } = await import("vitest");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  const { alertar } = await import("../alertas");
  const alertas = () => prisma.emailEnviado.count({ where: { tipo: "ALERTA" } });
  await alertar("sin destinatario", "detalle");
  expect(await alertas()).toBe(0);
  process.env.ALERTAS_EMAIL = "guardia@clinica.test";
  for (let i = 0; i < 12; i++) await alertar(`Error en bucle ${i}`, "Error: <script>x</script>\n  at algo");
  expect(await alertas()).toBe(10);
  expect((await prisma.emailEnviado.findFirstOrThrow({ where: { tipo: "ALERTA" } })).html).toContain("&#60;script&#62;"); // el detalle va escapado
});
