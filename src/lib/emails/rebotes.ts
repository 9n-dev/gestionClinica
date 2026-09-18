import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../db";

// Webhook de Resend: un email que rebota o que el destinatario marca como spam se apunta como fallido en emails_enviados,
// que es donde la clínica ve que ese paciente no está recibiendo nada. Resend firma con Svix.

/** Firma Svix: HMAC-SHA256 de `${id}.${timestamp}.${cuerpo}` con el secreto (lo que va tras "whsec_", en base64). */
export function firmaSvixValida(h: Headers, cuerpo: string, ahora = Date.now()) {
  const secreto = process.env.RESEND_WEBHOOK_SECRET;
  const [id, timestamp, firmas] = [h.get("svix-id"), h.get("svix-timestamp"), h.get("svix-signature")];
  if (!secreto || !id || !timestamp || !firmas) return false;
  if (Math.abs(ahora / 1000 - Number(timestamp)) > 300) return false; // una petición vieja reenviada no vale
  const esperada = createHmac("sha256", Buffer.from(secreto.replace(/^whsec_/, ""), "base64")).update(`${id}.${timestamp}.${cuerpo}`).digest();
  // La cabecera puede traer varias firmas ("v1,xxx v1,yyy") mientras se rota el secreto
  return firmas.split(" ").some((f) => {
    const recibida = Buffer.from(f.replace(/^v1,/, ""), "base64");
    return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
  });
}

const MOTIVOS: Record<string, string> = { "email.bounced": "rebotado: la dirección no existe o no admite correo", "email.complained": "marcado como spam por el destinatario" };

export async function registrarEvento(evento: { type?: string; data?: { email_id?: string } }) {
  const motivo = MOTIVOS[evento.type ?? ""];
  if (!motivo || !evento.data?.email_id) return 0;
  return (await prisma.emailEnviado.updateMany({ where: { proveedorId: evento.data.email_id }, data: { error: motivo } })).count;
}
