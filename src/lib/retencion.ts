import { anotar } from "./auditoria";
import { prisma } from "./db";
import { suprimirPaciente } from "./pacientes";

// Plazos de conservación, en meses. Los aplica el cron diario. 0 = no borrar nunca.
// RETENCION_CANCELADAS_MESES (12)  citas canceladas: es lo que promete la política de privacidad
// RETENCION_MENSAJES_MESES (12)    copia guardada de emails y mensajes (llevan nombre, teléfono y email)
// RETENCION_ACTIVIDAD_MESES (24)   registro de actividad
// RETENCION_PACIENTES_MESES (sin plazo)  pacientes sin ninguna cita en ese tiempo: se anonimizan, como en la supresión.
//   No tiene valor por defecto a propósito: es irreversible y el plazo lo decide cada clínica con su asesoría.
const meses = (clave: string, porDefecto: number) => {
  const n = Number(process.env[clave] ?? porDefecto);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
/** `n` meses antes. Si ese mes no tiene el día (31 de mayo menos 3), el último que tenga: 28 de febrero, no 3 de marzo. */
export function hace(ahora: Date, n: number) {
  const [anio, mes] = [ahora.getUTCFullYear(), ahora.getUTCMonth() - n];
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes, Math.min(ahora.getUTCDate(), ultimoDia)));
}

export async function aplicarRetencion(ahora = new Date()) {
  const r = { citasCanceladas: 0, pacientesInactivos: 0, emails: 0, mensajes: 0, actividad: 0 };

  const canceladas = meses("RETENCION_CANCELADAS_MESES", 12);
  if (canceladas) {
    const viejas = { estado: "CANCELADA" as const, canceladaAt: { lt: hace(ahora, canceladas) } };
    // Sus emails y mensajes se van con ellas. Si se quedaran, colgarían de ninguna cita (citaId pasa a null) con el nombre
    // y el teléfono dentro, y una supresión posterior del paciente ya no los encontraría.
    await prisma.emailEnviado.deleteMany({ where: { cita: viejas } });
    await prisma.mensajeEnviado.deleteMany({ where: { cita: viejas } });
    r.citasCanceladas = (await prisma.cita.deleteMany({ where: viejas })).count;
  }

  const inactivos = meses("RETENCION_PACIENTES_MESES", 0);
  if (inactivos) {
    const corte = hace(ahora, inactivos);
    const pacientes = await prisma.paciente.findMany({ where: { eliminadoAt: null, creadoAt: { lt: corte }, citas: { none: { inicio: { gte: corte } } } }, select: { id: true } });
    for (const { id } of pacientes) {
      if (!(await suprimirPaciente(id, ahora)).ok) continue;
      await anotar({ id: null, email: "sistema" }, "BORRAR", "paciente", id, `retención: sin citas en ${inactivos} meses`);
      r.pacientesInactivos++;
    }
  }

  const mensajes = meses("RETENCION_MENSAJES_MESES", 12);
  if (mensajes) {
    r.emails = (await prisma.emailEnviado.deleteMany({ where: { enviadoAt: { lt: hace(ahora, mensajes) } } })).count;
    r.mensajes = (await prisma.mensajeEnviado.deleteMany({ where: { enviadoAt: { lt: hace(ahora, mensajes) } } })).count;
  }

  const actividad = meses("RETENCION_ACTIVIDAD_MESES", 24);
  if (actividad) r.actividad = (await prisma.auditoria.deleteMany({ where: { creadoAt: { lt: hace(ahora, actividad) } } })).count;

  return r;
}
