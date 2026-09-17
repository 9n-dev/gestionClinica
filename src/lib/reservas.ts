import { Prisma } from "@/generated/prisma/client";
import { ANTELACION_MAX_DIAS, ANTELACION_MIN_HORAS } from "./clinica";
import { prisma } from "./db";
import { calcularHuecos, finDe, franjasDe } from "./disponibilidad";
import { emailsCitaCancelada, emailsCitaNueva } from "./emails/enviar";
import { aInstante, hoy, sumarDias, type Dia } from "./fechas";
import { nuevoToken } from "./seed-datos";

export const CUALQUIERA = "cualquiera";
const MAX_CITAS_POR_EMAIL = 3;

export type Hueco = { inicio: Date; profesionalIds: string[] };

export const primerInstanteReservable = () => new Date(Date.now() + ANTELACION_MIN_HORAS * 3_600_000);
export const ultimoDiaReservable = () => sumarDias(hoy(), ANTELACION_MAX_DIAS);

/**
 * Huecos libres por día para un servicio, de un profesional o de todos ("cualquiera").
 * Una sola consulta de citas y bloqueos para todo el rango.
 */
export async function huecosEnRango(p: { desde: Dia; dias: number; duracionMin: number; profesionalSlug?: string }) {
  const pros = await prisma.profesional.findMany({
    where: { activo: true, ...(p.profesionalSlug && p.profesionalSlug !== CUALQUIERA ? { slug: p.profesionalSlug } : {}) },
    include: { horarios: true },
    orderBy: { orden: "asc" },
  });
  const inicio = aInstante(p.desde);
  const fin = aInstante(sumarDias(p.desde, p.dias));
  const enRango = { inicio: { lt: fin }, fin: { gt: inicio } };
  const ids = pros.map((x) => x.id);
  const [citas, bloqueos] = await Promise.all([
    prisma.cita.findMany({ where: { ...enRango, profesionalId: { in: ids }, estado: { not: "CANCELADA" } }, select: { profesionalId: true, inicio: true, fin: true } }),
    prisma.bloqueo.findMany({ where: { ...enRango, OR: [{ profesionalId: null }, { profesionalId: { in: ids } }] } }),
  ]);

  const desde = primerInstanteReservable();
  const ultimo = ultimoDiaReservable();
  const resultado = new Map<Dia, Hueco[]>();
  for (let i = 0; i < p.dias; i++) {
    const dia = sumarDias(p.desde, i);
    const porInstante = new Map<number, Hueco>();
    if (dia <= ultimo) {
      for (const pro of pros) {
        const ocupados = [...citas.filter((c) => c.profesionalId === pro.id), ...bloqueos.filter((b) => !b.profesionalId || b.profesionalId === pro.id)];
        for (const h of calcularHuecos({ dia, duracionMin: p.duracionMin, tramos: pro.horarios, ocupados, desde })) {
          const hueco = porInstante.get(h.getTime()) ?? { inicio: h, profesionalIds: [] };
          hueco.profesionalIds.push(pro.id);
          porInstante.set(h.getTime(), hueco);
        }
      }
    }
    resultado.set(dia, [...porInstante.values()].sort((a, b) => a.inicio.getTime() - b.inicio.getTime()));
  }
  return resultado;
}

/** Primer hueco libre de los próximos días (para la portada). */
export async function proximoHueco(duracionMin: number) {
  const huecos = await huecosEnRango({ desde: hoy(), dias: 10, duracionMin });
  for (const [dia, hs] of huecos) if (hs.length) return { dia, ...hs[0] };
  return null;
}

type DatosReserva = { servicio: string; profesional: string; dia: Dia; hora: string; nombre: string; telefono: string; email: string };

export async function crearCita(d: DatosReserva): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const servicio = await prisma.servicio.findFirst({ where: { slug: d.servicio, activo: true } });
  if (!servicio) return { ok: false, error: "Ese servicio ya no está disponible." };

  const [h, m] = d.hora.split(":").map(Number);
  const inicio = aInstante(d.dia, h * 60 + m);

  // Se recalcula la disponibilidad en el servidor: valida horario, bloqueos, antelación y rejilla de una vez.
  const hueco = (await huecosEnRango({ desde: d.dia, dias: 1, duracionMin: servicio.duracionMin, profesionalSlug: d.profesional }))
    .get(d.dia)
    ?.find((x) => x.inicio.getTime() === inicio.getTime());
  if (!hueco) return { ok: false, error: "Ese hueco acaba de ocuparse. Elige otra hora, por favor." };

  const activas = await prisma.cita.count({ where: { pacienteEmail: d.email, estado: "CONFIRMADA", inicio: { gt: new Date() } } });
  if (activas >= MAX_CITAS_POR_EMAIL)
    return { ok: false, error: `Ya tienes ${activas} citas pendientes con este email. Llámanos si necesitas más.` };

  // "Cualquiera": primero el profesional con menos citas ese día.
  const carga = await prisma.cita.groupBy({
    by: ["profesionalId"],
    where: { profesionalId: { in: hueco.profesionalIds }, estado: { not: "CANCELADA" }, inicio: { gte: aInstante(d.dia), lt: aInstante(sumarDias(d.dia, 1)) } },
    _count: true,
  });
  const citasDe = (id: string) => carga.find((c) => c.profesionalId === id)?._count ?? 0;
  const candidatos = [...hueco.profesionalIds].sort((a, b) => citasDe(a) - citasDe(b));

  for (const profesionalId of candidatos) {
    try {
      // Cita y franjas se insertan en una única transacción. Si otra reserva ocupó alguna franja,
      // la clave primaria (profesionalId, inicio) de franjas_ocupadas falla y no se guarda nada.
      const cita = await prisma.cita.create({
        data: {
          servicioId: servicio.id,
          profesionalId,
          inicio,
          fin: finDe(inicio, servicio.duracionMin),
          pacienteNombre: d.nombre,
          pacienteTelefono: d.telefono,
          pacienteEmail: d.email,
          tokenCancelacion: nuevoToken(),
          franjas: { create: franjasDe(inicio, servicio.duracionMin).map((f) => ({ profesionalId, inicio: f })) },
        },
        include: { servicio: true, profesional: true },
      });
      await emailsCitaNueva(cita);
      return { ok: true, token: cita.tokenCancelacion };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue; // franja ocupada: probar el siguiente
      throw e;
    }
  }
  return { ok: false, error: "Ese hueco acaba de ocuparse. Elige otra hora, por favor." };
}

/** Cancela y libera las franjas. Devuelve false si la cita no estaba confirmada. */
export async function cancelarCita(where: { id: string } | { tokenCancelacion: string }, avisarPaciente = true) {
  const cita = await prisma.cita.findUnique({ where, include: { servicio: true, profesional: true } });
  if (!cita || cita.estado !== "CONFIRMADA") return false;
  await prisma.$transaction([
    prisma.cita.update({ where: { id: cita.id }, data: { estado: "CANCELADA", canceladaAt: new Date() } }),
    prisma.franjaOcupada.deleteMany({ where: { citaId: cita.id } }),
  ]);
  await emailsCitaCancelada(cita, avisarPaciente);
  return true;
}

