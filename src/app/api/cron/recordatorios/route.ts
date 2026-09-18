import { conAlerta, cronAutorizado } from "@/lib/cron";
import { prisma } from "@/lib/db";
import { emailRecordatorio } from "@/lib/emails/enviar";
import { plantillas } from "@/lib/emails/plantillas";
import { borrarIntentosViejos } from "@/lib/limite";
import { enviarMensaje } from "@/lib/mensajes";
import { aplicarRetencion } from "@/lib/retencion";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Con un cron diario (plan Hobby de Vercel) la ventana de 36 h cubre todas las citas de mañana.
// Con un cron horario (plan Pro), RECORDATORIO_VENTANA_HORAS=24 avisa justo 24 h antes.
const ventanaHoras = () => Number(process.env.RECORDATORIO_VENTANA_HORAS) || 36;

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return new Response("No autorizado", { status: 401 });
  return conAlerta("de recordatorios", recordarYLimpiar);
}

async function recordarYLimpiar() {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + ventanaHoras() * 3_600_000);
  const citas = await prisma.cita.findMany({
    where: { estado: "CONFIRMADA", recordatorioEnviadoAt: null, inicio: { gt: ahora, lte: limite } },
    include: { servicio: true, profesional: true },
  });

  let enviados = 0;
  for (const cita of citas) {
    // Se reserva la cita antes de enviar: si dos ejecuciones coinciden, solo una la consigue.
    const { count } = await prisma.cita.updateMany({ where: { id: cita.id, recordatorioEnviadoAt: null }, data: { recordatorioEnviadoAt: ahora } });
    if (!count) continue;
    // Al móvil siempre (todo paciente tiene teléfono; email, no todos) y además por email si lo hay. Con que llegue uno, vale.
    const alMovil = await enviarMensaje({ tipo: "RECORDATORIO", telefono: cita.pacienteTelefono, citaId: cita.id, ...plantillas.recordatorioMovil(cita) });
    const porEmail = cita.pacienteEmail ? await emailRecordatorio({ ...cita, pacienteEmail: cita.pacienteEmail }) : null;
    // Escribirlo en la consola (sin Twilio) no es habérselo dicho al paciente: si además el email ha fallado, se reintenta.
    // Sin ningún proveedor, como en la demo, la consola se da por buena para no reintentar eternamente.
    if (alMovil === "ENVIADO" || porEmail === true || (alMovil === "CONSOLA" && porEmail !== false)) enviados++;
    else await prisma.cita.update({ where: { id: cita.id }, data: { recordatorioEnviadoAt: null } }); // se reintenta en la próxima pasada
  }
  // Es el cron diario: de paso, la limpieza. Contadores del límite de intentos y plazos de conservación de datos.
  await borrarIntentosViejos();
  return { pendientes: citas.length, enviados, retencion: await aplicarRetencion() };
}
