import { cronAutorizado } from "@/lib/cron";
import { prisma } from "@/lib/db";
import { emailRecordatorio } from "@/lib/emails/enviar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Con un cron diario (plan Hobby de Vercel) la ventana de 36 h cubre todas las citas de mañana.
// Con un cron horario (plan Pro), RECORDATORIO_VENTANA_HORAS=24 avisa justo 24 h antes.
const ventanaHoras = () => Number(process.env.RECORDATORIO_VENTANA_HORAS) || 36;

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return new Response("No autorizado", { status: 401 });

  const ahora = new Date();
  const limite = new Date(ahora.getTime() + ventanaHoras() * 3_600_000);
  const citas = await prisma.cita.findMany({
    where: { estado: "CONFIRMADA", recordatorioEnviadoAt: null, pacienteEmail: { not: null }, inicio: { gt: ahora, lte: limite } },
    include: { servicio: true, profesional: true },
  });

  let enviados = 0;
  for (const cita of citas) {
    // Se reserva la cita antes de enviar: si dos ejecuciones coinciden, solo una la consigue.
    const { count } = await prisma.cita.updateMany({ where: { id: cita.id, recordatorioEnviadoAt: null }, data: { recordatorioEnviadoAt: ahora } });
    if (!count) continue;
    if (await emailRecordatorio({ ...cita, pacienteEmail: cita.pacienteEmail! })) enviados++;
    else await prisma.cita.update({ where: { id: cita.id }, data: { recordatorioEnviadoAt: null } }); // se reintenta en la próxima pasada
  }
  return Response.json({ pendientes: citas.length, enviados });
}
