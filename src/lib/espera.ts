import { prisma } from "./db";

/**
 * A quién de la lista de espera le encaja el hueco que deja una cita, por orden de llegada:
 * su servicio cabe en esos minutos, lo hace ese profesional, y pidió a ese profesional o le daba igual.
 */
export function candidatosPara(hueco: { profesionalId: string; inicio: Date; fin: Date }) {
  const minutos = (hueco.fin.getTime() - hueco.inicio.getTime()) / 60_000;
  return prisma.enEspera.findMany({
    where: {
      atendidoAt: null,
      paciente: { eliminadoAt: null },
      OR: [{ profesionalId: null }, { profesionalId: hueco.profesionalId }],
      servicio: { activo: true, duracionMin: { lte: minutos }, profesionales: { some: { id: hueco.profesionalId } } },
    },
    orderBy: { creadoAt: "asc" },
    include: { paciente: true, servicio: true, profesional: true },
  });
}
