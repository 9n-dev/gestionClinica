import { createHmac } from "node:crypto";
import { rmSync } from "node:fs";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";

const RUTA = `/tmp/podologia-test-mensajes-${process.pid}.db`;
process.env.DATABASE_URL = `file:${RUTA}`;
process.env.APP_URL = "https://clinica.test";
const { prisma } = await import("./db");
const { migrar } = await import("./migraciones");
const { enviarMensaje, estadoDeTwilio, firmaValida, paraSms } = await import("./mensajes");

const TWILIO = { TWILIO_ACCOUNT_SID: "AC123", TWILIO_AUTH_TOKEN: "secreto", TWILIO_SMS_FROM: "+34900000000", TWILIO_WHATSAPP_FROM: "+34911111111", TWILIO_WHATSAPP_PLANTILLA: "HX999" };
const mensaje = { tipo: "RECORDATORIO" as const, telefono: "612345678", texto: "Podología: tu cita es mañana a las 10:00", variables: ["Ana", "mañana", "10:00"] };
const respuestas = (...rs: [number, object][]) => {
  const f = vi.fn();
  for (const [status, cuerpo] of rs) f.mockResolvedValueOnce(new Response(JSON.stringify(cuerpo), { status }));
  vi.stubGlobal("fetch", f);
  return f;
};
const cuerpoDe = (f: ReturnType<typeof vi.fn>, n: number) => Object.fromEntries(new URLSearchParams(f.mock.calls[n][1].body));

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  await migrar();
});
afterEach(async () => {
  for (const k of Object.keys(TWILIO)) delete process.env[k];
  vi.unstubAllGlobals();
  await prisma.mensajeEnviado.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
  rmSync(RUTA, { force: true });
});

it("sin credenciales de Twilio no sale nada: consola y registro", async () => {
  const f = respuestas();
  expect(await enviarMensaje(mensaje)).toBe(true);
  expect(f).not.toHaveBeenCalled();
  expect(await prisma.mensajeEnviado.findMany()).toMatchObject([{ canal: "CONSOLA", para: "+34612345678", texto: mensaje.texto, error: null }]);
});

it("con plantilla, sale por WhatsApp con sus variables y el webhook de estado", async () => {
  Object.assign(process.env, TWILIO);
  const f = respuestas([201, { sid: "SM1" }]);
  expect(await enviarMensaje(mensaje)).toBe(true);
  expect(f.mock.calls[0][0]).toBe("https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json");
  expect(f.mock.calls[0][1].headers.authorization).toBe(`Basic ${Buffer.from("AC123:secreto").toString("base64")}`);
  expect(cuerpoDe(f, 0)).toEqual({
    To: "whatsapp:+34612345678",
    From: "whatsapp:+34911111111",
    ContentSid: "HX999",
    ContentVariables: JSON.stringify({ 1: "Ana", 2: "mañana", 3: "10:00" }),
    StatusCallback: "https://clinica.test/api/twilio/estado",
  });
  expect(await prisma.mensajeEnviado.findMany()).toMatchObject([{ canal: "WHATSAPP", proveedorId: "SM1", error: null }]);
});

it("si Twilio rechaza el WhatsApp en el acto, sale el SMS (sin acentos que lo encarezcan)", async () => {
  Object.assign(process.env, TWILIO);
  const f = respuestas([400, { message: "plantilla no aprobada" }], [201, { sid: "SM2" }]);
  expect(await enviarMensaje(mensaje)).toBe(true);
  expect(cuerpoDe(f, 1)).toEqual({ To: "+34612345678", From: "+34900000000", Body: "Podologia: tu cita es mañana a las 10:00" });
  const filas = await prisma.mensajeEnviado.findMany({ orderBy: { enviadoAt: "asc" } });
  expect(filas).toMatchObject([{ canal: "WHATSAPP", error: "plantilla no aprobada" }, { canal: "SMS", proveedorId: "SM2", error: null }]);
});

it("si el WhatsApp falla después (no tiene WhatsApp), el webhook dispara el SMS una sola vez", async () => {
  Object.assign(process.env, TWILIO);
  const f = respuestas([201, { sid: "SM3" }], [201, { sid: "SM4" }]);
  await enviarMensaje(mensaje);
  await estadoDeTwilio({ MessageSid: "SM3", MessageStatus: "delivered" });
  expect(f).toHaveBeenCalledTimes(1);
  await estadoDeTwilio({ MessageSid: "SM3", MessageStatus: "undelivered", ErrorCode: "63003" });
  await estadoDeTwilio({ MessageSid: "SM3", MessageStatus: "failed", ErrorCode: "63003" }); // Twilio repite avisos
  expect(f).toHaveBeenCalledTimes(2);
  const filas = await prisma.mensajeEnviado.findMany({ orderBy: { enviadoAt: "asc" } });
  expect(filas).toMatchObject([{ canal: "WHATSAPP", error: "undelivered (63003)" }, { canal: "SMS", proveedorId: "SM4", texto: mensaje.texto }]);
});

it("el webhook solo acepta peticiones firmadas por Twilio", () => {
  process.env.TWILIO_AUTH_TOKEN = "secreto";
  const parametros = { MessageStatus: "failed", MessageSid: "SM9" };
  // Algoritmo de Twilio: HMAC-SHA1, en base64, de la URL seguida de cada parámetro (clave+valor) en orden alfabético
  const firma = createHmac("sha1", "secreto").update("https://clinica.test/api/twilio/estadoMessageSidSM9MessageStatusfailed").digest("base64");
  expect(firmaValida(firma, parametros)).toBe(true);
  expect(firmaValida(firma, { ...parametros, MessageSid: "SM-otro" })).toBe(false);
  expect(firmaValida(null, parametros)).toBe(false);
  delete process.env.TWILIO_AUTH_TOKEN;
  expect(firmaValida(firma, parametros)).toBe(false);
});

it("paraSms deja el texto en GSM-7", () => {
  expect(paraSms("Podología Núñez: miércoles a las 9:00. ¿Dudas? Llámanos")).toBe("Podologia Nuñez: miércoles a las 9:00. ¿Dudas? Llamanos") // é y ñ se quedan: están en GSM-7;
});
