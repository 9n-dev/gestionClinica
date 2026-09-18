import { Prisma } from "@/generated/prisma/client";
import { ANTELACION_MAX_DIAS, ANTELACION_MIN_HORAS } from "./clinica";
import { prisma } from "./db";
import { calcularHuecos, finDe, franjasDe } from "./disponibilidad";
import { emailCitaModificada, emailsCitaCancelada, emailsCitaNueva } from "./emails/enviar";
import { aInstante, hoy, sumarDias, type Dia } from "./fechas";
import { normalizarNombre } from "./pacientes";
import { nuevoToken } from "./seed-datos";

export const CUALQUIERA = "cualquiera";
const MAX_CITAS_POR_EMAIL = 3;

export type Hueco = { inicio: Date; profesionalIds: string[] };

export const primerInstanteReservable = () => new Date(Date.now() + ANTELACION_MIN_HORAS * 3_600_000);
export const ultimoDiaReservable = () => sumarDias(hoy(), ANTELACION_MAX_DIAS);

/**
 * Huecos libres por día para un servicio, de un profesional o de todos ("cualquiera"). Solo cuentan los profesionales
 * que hacen ese servicio: es aquí donde se decide, así que vale igual para la web, el panel, crear y mover.
 * Una sola consulta de citas y bloqueos para todo el rango.
 * - desdePanel: sin antelación mínima ni tope de días (la clínica reserva para hoy mismo)
 * - excluirCitaId: al mover una cita, sus propias franjas no cuentan como ocupadas
 */
export async function huecosEnRango(p: { desde: Dia; dias: number; servicioId: string; duracionMin: number; profesionalSlug?: string; desdePanel?: boolean; excluirCitaId?: string }) {
  const pros = await prisma.profesional.findMany({
    where: { activo: true, servicios: { some: { id: p.servicioId } }, ...(p.profesionalSlug && p.profesionalSlug !== CUALQUIERA ? { slug: p.profesionalSlug } : {}) },
    include: { horarios: true },
    orderBy: { orden: "asc" },
  });
  const inicio = aInstante(p.desde);
  const fin = aInstante(sumarDias(p.desde, p.dias));
  const enRango = { inicio: { lt: fin }, fin: { gt: inicio } };
  const ids = pros.map((x) => x.id);
  const [citas, bloqueos] = await Promise.all([
    prisma.cita.findMany({
      where: { ...enRango, profesionalId: { in: ids }, estado: { not: "CANCELADA" }, ...(p.excluirCitaId ? { id: { not: p.excluirCitaId } } : {}) },
      select: { profesionalId: true, inicio: true, fin: true },
    }),
    prisma.bloqueo.findMany({ where: { ...enRango, OR: [{ profesionalId: null }, { profesionalId: { in: ids } }] } }),
  ]);

  const desde = p.desdePanel ? new Date() : primerInstanteReservable();
  const ultimo = p.desdePanel ? "9999-12-31" : ultimoDiaReservable();
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
export async function proximoHueco(servicio: { id: string; duracionMin: number }) {
  const huecos = await huecosEnRango({ desde: hoy(), dias: 10, servicioId: servicio.id, duracionMin: servicio.duracionMin });
  for (const [dia, hs] of huecos) if (hs.length) return { dia, ...hs[0] };
  return null;
}

type DatosReserva = { servicio: string; profesional: string; dia: Dia; hora: string; nombre: string; telefono: string; email: string | null; notas?: string };

const instanteDe = (dia: Dia, hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return aInstante(dia, h * 60 + m);
};

/** `avisar = false`: no envía los emails de cita nueva (las citas de una serie se anuncian juntas, con emailsSerie). */
export async function crearCita(d: DatosReserva, desdePanel = false, avisar = true): Promise<{ ok: true; token: string; id: string } | { ok: false; error: string }> {
  const servicio = await prisma.servicio.findFirst({ where: { slug: d.servicio, activo: true } });
  if (!servicio) return { ok: false, error: "Ese servicio ya no está disponible." };

  const inicio = instanteDe(d.dia, d.hora);

  // Se recalcula la disponibilidad en el servidor: valida horario, bloqueos, antelación y rejilla de una vez.
  const hueco = (await huecosEnRango({ desde: d.dia, dias: 1, servicioId: servicio.id, duracionMin: servicio.duracionMin, profesionalSlug: d.profesional, desdePanel }))
    .get(d.dia)
    ?.find((x) => x.inicio.getTime() === inicio.getTime());
  if (!hueco) return { ok: false, error: "Ese hueco acaba de ocuparse. Elige otra hora, por favor." };

  if (!desdePanel && d.email) {
    const activas = await prisma.cita.count({ where: { pacienteEmail: d.email, estado: "CONFIRMADA", inicio: { gt: new Date() } } });
    if (activas >= MAX_CITAS_POR_EMAIL)
      return { ok: false, error: `Ya tienes ${activas} citas pendientes con este email. Llámanos si necesitas más.` };
  }

  // "Cualquiera": primero el profesional con menos citas ese día.
  const carga = await prisma.cita.groupBy({
    by: ["profesionalId"],
    where: { profesionalId: { in: hueco.profesionalIds }, estado: { not: "CANCELADA" }, inicio: { gte: aInstante(d.dia), lt: aInstante(sumarDias(d.dia, 1)) } },
    _count: true,
  });
  const citasDe = (id: string) => carga.find((c) => c.profesionalId === id)?._count ?? 0;
  const candidatos = [...hueco.profesionalIds].sort((a, b) => citasDe(a) - citasDe(b));

  const nombreNorm = normalizarNombre(d.nombre);
  // Dos intentos por profesional: ver el comentario del catch.
  for (const profesionalId of candidatos.flatMap((id) => [id, id])) {
    try {
      // Cita, franjas y paciente (si es nuevo) se insertan en una única transacción. Si otra reserva ocupó alguna franja,
      // la clave primaria (profesionalId, inicio) de franjas_ocupadas falla y no se guarda nada.
      const cita = await prisma.cita.create({
        data: {
          servicio: { connect: { id: servicio.id } },
          profesional: { connect: { id: profesionalId } },
          inicio,
          fin: finDe(inicio, servicio.duracionMin),
          precioCent: servicio.precioCent,
          paciente: {
            connectOrCreate: {
              where: { telefono_nombreNorm: { telefono: d.telefono, nombreNorm } },
              create: { nombre: d.nombre, nombreNorm, telefono: d.telefono, email: d.email },
            },
          },
          pacienteNombre: d.nombre,
          pacienteTelefono: d.telefono,
          pacienteEmail: d.email,
          notas: d.notas || null,
          tokenCancelacion: nuevoToken(),
          franjas: { create: franjasDe(inicio, servicio.duracionMin).map((f) => ({ profesionalId, inicio: f })) },
        },
        include: { servicio: true, profesional: true },
      });
      // Paciente que ya existía. Desde el panel, el email que dicta recepción es el bueno. Desde la web solo se rellena si
      // faltaba: a quien reserva no se le ha verificado nada, y con saber el nombre y el teléfono de otro le cambiaría el
      // email de la ficha, adonde irían después sus confirmaciones y sus enlaces para cancelar.
      if (d.email) await prisma.paciente.updateMany({ where: { id: cita.pacienteId, ...(desdePanel ? {} : { email: null }) }, data: { email: d.email } });
      if (avisar) await emailsCitaNueva(cita);
      return { ok: true, token: cita.tokenCancelacion, id: cita.id };
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      // Clave repetida. Casi siempre es la franja (alguien se adelantó): toca el siguiente profesional. Pero también salta
      // si dos reservas crean a la vez la ficha del mismo paciente nuevo; ahí el hueco sigue libre y basta con repetir,
      // que ahora la ficha ya existe. Se distingue mirando si la franja está ocupada de verdad.
      const ocupada = await prisma.franjaOcupada.count({ where: { profesionalId, inicio: { in: franjasDe(inicio, servicio.duracionMin) } } });
      if (ocupada) continue;
      throw e;
    }
  }
  return { ok: false, error: "Ese hueco acaba de ocuparse. Elige otra hora, por favor." };
}

/**
 * Mueve una cita confirmada a otro día, hora o profesional. Libera las franjas viejas y ocupa las
 * nuevas en una sola transacción: si el hueco nuevo está pillado, la cita se queda como estaba.
 */
export async function moverCita(id: string, destino: { profesional: string; dia: Dia; hora: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const cita = await prisma.cita.findUnique({ where: { id }, include: { servicio: true } });
  if (!cita || cita.estado !== "CONFIRMADA") return { ok: false, error: "Solo se pueden mover citas confirmadas." };
  const pro = await prisma.profesional.findFirst({ where: { slug: destino.profesional, activo: true } });
  if (!pro) return { ok: false, error: "Ese profesional no está disponible." };

  const inicio = instanteDe(destino.dia, destino.hora);
  if (inicio.getTime() === cita.inicio.getTime() && pro.id === cita.profesionalId) return { ok: true };
  const hueco = (await huecosEnRango({ desde: destino.dia, dias: 1, servicioId: cita.servicioId, duracionMin: cita.servicio.duracionMin, profesionalSlug: pro.slug, desdePanel: true, excluirCitaId: id }))
    .get(destino.dia)
    ?.find((x) => x.inicio.getTime() === inicio.getTime());
  if (!hueco) return { ok: false, error: "Ese hueco no está libre (fuera de horario, bloqueado u ocupado) o ese profesional no hace este servicio." };

  try {
    await prisma.$transaction([
      prisma.franjaOcupada.deleteMany({ where: { citaId: id } }),
      // `estado: "CONFIRMADA"` en el where: si el paciente la cancela mientras recepción la mueve, este update no encuentra
      // nada, falla y se lleva la transacción entera. Sin eso, quedaba una cita cancelada con franjas ocupadas: un hueco
      // que la web ofrecía y nadie podía reservar. El recordatorio se reinicia: el de la fecha vieja ya no vale para la nueva.
      prisma.cita.update({ where: { id, estado: "CONFIRMADA" }, data: { profesionalId: pro.id, inicio, fin: finDe(inicio, cita.servicio.duracionMin), recordatorioEnviadoAt: null } }),
      prisma.franjaOcupada.createMany({ data: franjasDe(inicio, cita.servicio.duracionMin).map((f) => ({ citaId: id, profesionalId: pro.id, inicio: f })) }),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "Ese hueco acaba de ocuparse." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return { ok: false, error: "Solo se pueden mover citas confirmadas: esta acaba de cancelarse." };
    throw e;
  }
  const movida = await prisma.cita.findUniqueOrThrow({ where: { id }, include: { servicio: true, profesional: true } });
  await emailCitaModificada(movida);
  return { ok: true };
}

/** Cancela y libera las franjas. Devuelve false si la cita no estaba confirmada. */
export async function cancelarCita(where: { id: string } | { tokenCancelacion: string }, avisarPaciente = true) {
  const cita = await prisma.cita.findUnique({ where, include: { servicio: true, profesional: true } });
  if (!cita || cita.estado !== "CONFIRMADA") return false;
  // Con el enlace del email no se toca una cita que ya ha pasado (la página esconde el botón, pero eso no es una comprobación).
  if ("tokenCancelacion" in where && cita.inicio <= new Date()) return false;
  await prisma.$transaction([
    prisma.cita.update({ where: { id: cita.id }, data: { estado: "CANCELADA", canceladaAt: new Date() } }),
    prisma.franjaOcupada.deleteMany({ where: { citaId: cita.id } }),
  ]);
  await emailsCitaCancelada(cita, avisarPaciente);
  return true;
}

