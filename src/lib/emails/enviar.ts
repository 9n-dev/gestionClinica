import { Resend } from "resend";
import type { TipoEmail } from "@/generated/prisma/client";
import { prisma } from "../db";
import { plantillas, type CitaCompleta } from "./plantillas";

const clinica = () => process.env.EMAIL_CLINICA || "clinica@podologiaserrano.es";

/**
 * Envía con Resend si hay API key; si no, escribe en consola. Siempre queda registrado
 * en emails_enviados. Nunca lanza: un fallo de email no debe tumbar una reserva.
 */
export async function enviarEmail(e: { tipo: TipoEmail; para: string; asunto: string; html: string; citaId?: string }) {
  // Los pacientes del seed usan @ejemplo.com: jamás se les envía nada real.
  const real = !!process.env.RESEND_API_KEY && !e.para.endsWith("@ejemplo.com");
  let error: string | null = null;
  try {
    if (real) {
      const r = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.EMAIL_FROM || "Podología Serrano <onboarding@resend.dev>",
        to: e.para,
        subject: e.asunto,
        html: e.html,
      });
      if (r.error) error = r.error.message;
    } else {
      console.log(`[email:${e.tipo}] para=${e.para} · ${e.asunto}`);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  if (error) console.error(`[email:${e.tipo}] fallo al enviar a ${e.para}: ${error}`);
  try {
    await prisma.emailEnviado.create({ data: { ...e, canal: real ? "RESEND" : "CONSOLA", error } });
  } catch (err) {
    console.error("[email] no se pudo registrar el email", err);
  }
  return !error;
}

export async function emailsCitaNueva(c: CitaCompleta) {
  if (c.pacienteEmail) await enviarEmail({ tipo: "CONFIRMACION_PACIENTE", para: c.pacienteEmail, citaId: c.id, ...plantillas.confirmacionPaciente(c) });
  await enviarEmail({ tipo: "AVISO_CLINICA", para: clinica(), citaId: c.id, ...plantillas.avisoClinica(c) });
}

export async function emailsCitaCancelada(c: CitaCompleta, avisarPaciente: boolean) {
  if (avisarPaciente && c.pacienteEmail) await enviarEmail({ tipo: "CANCELACION", para: c.pacienteEmail, citaId: c.id, ...plantillas.cancelacionPaciente(c) });
  await enviarEmail({ tipo: "CANCELACION", para: clinica(), citaId: c.id, ...plantillas.cancelacionClinica(c) });
}

export const emailRecordatorio = (c: CitaCompleta & { pacienteEmail: string }) =>
  enviarEmail({ tipo: "RECORDATORIO", para: c.pacienteEmail, citaId: c.id, ...plantillas.recordatorio(c) });

export const emailCitaModificada = async (c: CitaCompleta) => {
  if (c.pacienteEmail) await enviarEmail({ tipo: "MODIFICACION", para: c.pacienteEmail, citaId: c.id, ...plantillas.modificacionPaciente(c) });
};
