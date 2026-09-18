import { createHmac, timingSafeEqual } from "node:crypto";
import type { CanalMensaje, TipoEmail } from "@/generated/prisma/client";
import { URL_BASE } from "./clinica";
import { prisma } from "./db";

// Mensajes al móvil con Twilio, por su API REST (sin SDK). Mismo trato que los emails: sin credenciales van a la
// consola, y siempre quedan en mensajes_enviados.
// Orden: WhatsApp con plantilla aprobada y, si falla, SMS. El fallo puede llegar en el acto (Twilio rechaza la
// petición) o después, por webhook: Twilio acepta un WhatsApp para un número sin WhatsApp y avisa luego.

type Mensaje = {
  tipo: TipoEmail;
  telefono: string; // 9 cifras, como se guarda
  texto: string; // lo que se lee en el SMS y en el registro
  variables: string[]; // los huecos {{1}}, {{2}}… de la plantilla de WhatsApp, en orden
  citaId?: string;
};

const urlEstado = () => `${URL_BASE()}/api/twilio/estado`;
const e164 = (telefono: string) => `+34${telefono}`;

/**
 * Un SMS con un solo carácter fuera del alfabeto GSM-7 pasa a UCS-2: caben 70 caracteres en vez de 160 y se cobra
 * el triple. á, í, ó y ú no están en GSM-7; é, ñ, ü, ¿ y ¡ sí.
 */
export const paraSms = (texto: string) => texto.replace(/[áíóúÁÍÓÚ]/g, (c) => "aiouAIOU"["áíóúÁÍÓÚ".indexOf(c)]);

async function twilio(cuerpo: Record<string, string>): Promise<{ sid?: string; error?: string }> {
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: { authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}` },
      body: new URLSearchParams(cuerpo),
    });
    const datos = await r.json();
    return r.ok ? { sid: datos.sid } : { error: String(datos.message ?? `HTTP ${r.status}`) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

const registrar = (m: Mensaje, canal: CanalMensaje, r: { sid?: string; error?: string }) =>
  prisma.mensajeEnviado.create({ data: { tipo: m.tipo, canal, para: e164(m.telefono), texto: m.texto, citaId: m.citaId, proveedorId: r.sid, error: r.error } });

async function enviarSms(m: Mensaje) {
  if (!process.env.TWILIO_SMS_FROM) return false;
  const r = await twilio({ To: e164(m.telefono), From: process.env.TWILIO_SMS_FROM, Body: paraSms(m.texto) });
  await registrar(m, "SMS", r);
  return !r.error;
}

/** Nunca lanza: un fallo al avisar no debe tumbar lo que lo llamó. Devuelve si el mensaje ha salido por algún canal. */
export async function enviarMensaje(m: Mensaje) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`[mensaje:${m.tipo}] para=${e164(m.telefono)} · ${m.texto}`);
      await registrar(m, "CONSOLA", {});
      return true;
    }
    if (process.env.TWILIO_WHATSAPP_FROM && process.env.TWILIO_WHATSAPP_PLANTILLA) {
      // Fuera de una conversación abierta por el paciente, WhatsApp solo admite plantillas aprobadas.
      const r = await twilio({
        To: `whatsapp:${e164(m.telefono)}`,
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
        ContentSid: process.env.TWILIO_WHATSAPP_PLANTILLA,
        ContentVariables: JSON.stringify(Object.fromEntries(m.variables.map((v, i) => [i + 1, v]))),
        StatusCallback: urlEstado(),
      });
      await registrar(m, "WHATSAPP", r);
      if (!r.error) return true;
    }
    return await enviarSms(m);
  } catch (e) {
    console.error("[mensaje] fallo inesperado", e);
    return false;
  }
}

/** Webhook de estado de Twilio. Si un WhatsApp no llega, se apunta y sale el SMS; una sola vez, aunque Twilio repita el aviso. */
export async function estadoDeTwilio(p: Record<string, string>) {
  if (p.MessageStatus !== "failed" && p.MessageStatus !== "undelivered") return;
  const error = `${p.MessageStatus}${p.ErrorCode ? ` (${p.ErrorCode})` : ""}`;
  // La condición `error: null` hace de cerrojo: solo el primer aviso consigue marcar la fila.
  const { count } = await prisma.mensajeEnviado.updateMany({ where: { proveedorId: p.MessageSid, canal: "WHATSAPP", error: null }, data: { error } });
  if (!count) return;
  const m = await prisma.mensajeEnviado.findUniqueOrThrow({ where: { proveedorId: p.MessageSid } });
  await enviarSms({ tipo: m.tipo, telefono: m.para.replace(/^\+34/, ""), texto: m.texto, variables: [], citaId: m.citaId ?? undefined });
}

/** Firma de Twilio: HMAC-SHA1 (clave: el auth token), en base64, de la URL del webhook seguida de cada parámetro, clave y valor, por orden alfabético. */
export function firmaValida(firma: string | null, parametros: Record<string, string>) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !firma) return false;
  const datos = urlEstado() + Object.keys(parametros).sort().map((k) => k + parametros[k]).join("");
  const esperada = Buffer.from(createHmac("sha1", token).update(datos).digest("base64"));
  const recibida = Buffer.from(firma);
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}
