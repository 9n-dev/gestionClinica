import { prisma } from "./db";
import { aInstante, diaDe, diaSemana, sumarDias, type Dia } from "./fechas";

// Números del panel de estadísticas. Un mes es "2026-09", en hora de Madrid.

export type Mes = string;
type Tramo = { diaSemana: number; minInicio: number; minFin: number };
type Intervalo = { inicio: Date; fin: Date };

export const esMes = (s: unknown): s is Mes => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
export const sumarMeses = (mes: Mes, n: number): Mes => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5)) - 1 + n, 1)).toISOString().slice(0, 7);
const diasDe = (mes: Mes) => {
  const dias: Dia[] = [];
  for (let d: Dia = `${mes}-01`; d.startsWith(mes); d = sumarDias(d, 1)) dias.push(d);
  return dias;
};

/**
 * Minutos de agenda que se pueden llenar: el horario de cada día menos los bloqueos.
 * Por franjas de 15 minutos, como la reserva: una franja cuenta si ningún bloqueo la toca. Así los bloqueos que
 * se pisan no restan dos veces y lo que cae fuera del horario no resta nada.
 */
export function minutosDisponibles(dias: Dia[], tramos: Tramo[], bloqueos: Intervalo[]) {
  let minutos = 0;
  for (const dia of dias)
    for (const t of tramos.filter((x) => x.diaSemana === diaSemana(dia)))
      for (let m = t.minInicio; m + 15 <= t.minFin; m += 15) {
        const desde = aInstante(dia, m).getTime();
        if (!bloqueos.some((b) => b.inicio.getTime() < desde + 900_000 && b.fin.getTime() > desde)) minutos += 15;
      }
  return minutos;
}

// ingresosCent: lo atendido, a su tarifa. cobradoCent: lo que ha entrado en caja. sinCobrarCent: atendido y aún sin cobrar.
const vacio = () => ({ atendidas: 0, noPresentadas: 0, canceladas: 0, pendientes: 0, ingresosCent: 0, cobradoCent: 0, sinCobrarCent: 0 });
const apuntar = (c: { estado: string; precioCent: number; pagadaAt: Date | null; cobradoCent: number | null }, t: ReturnType<typeof vacio>) => {
  if (c.pagadaAt) t.cobradoCent += c.cobradoCent ?? 0;
  if (c.estado === "ATENDIDA") { t.atendidas++; t.ingresosCent += c.precioCent; if (!c.pagadaAt) t.sinCobrarCent += c.precioCent; }
  else if (c.estado === "NO_PRESENTADA") t.noPresentadas++;
  else if (c.estado === "CANCELADA") t.canceladas++;
  else t.pendientes++;
};
/** De cada 100 citas que debían haberse atendido, cuántas se quedaron plantadas. null si aún no hay ninguna. */
export const tasaAusencias = (t: { atendidas: number; noPresentadas: number }) => (t.atendidas + t.noPresentadas ? (100 * t.noPresentadas) / (t.atendidas + t.noPresentadas) : null);

export async function estadisticas(mes: Mes, mesesDeTendencia = 6) {
  const meses = Array.from({ length: mesesDeTendencia }, (_, i) => sumarMeses(mes, i + 1 - mesesDeTendencia));
  const [desde, inicioMes, fin] = [aInstante(`${meses[0]}-01`), aInstante(`${mes}-01`), aInstante(`${sumarMeses(mes, 1)}-01`)];
  const [citas, profesionales, servicios, bloqueos] = await Promise.all([
    prisma.cita.findMany({ where: { inicio: { gte: desde, lt: fin } }, select: { inicio: true, fin: true, estado: true, precioCent: true, pagadaAt: true, cobradoCent: true, profesionalId: true, servicioId: true } }),
    prisma.profesional.findMany({ where: { activo: true }, orderBy: { orden: "asc" }, include: { horarios: true } }),
    prisma.servicio.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.bloqueo.findMany({ where: { inicio: { lt: fin }, fin: { gt: inicioMes } } }),
  ]);

  const porMes = new Map(meses.map((m) => [m, vacio()]));
  for (const c of citas) apuntar(c, porMes.get(diaDe(c.inicio).slice(0, 7))!);

  const delMes = citas.filter((c) => c.inicio >= inicioMes);
  const dias = diasDe(mes);
  const porProfesional = profesionales.map((p) => {
    const suyas = delMes.filter((c) => c.profesionalId === p.id);
    const t = vacio();
    suyas.forEach((c) => apuntar(c, t));
    // ponytail: con el horario de HOY. Si alguien cambió de horario a mitad de un mes pasado, su ocupación de ese mes
    // sale aproximada; para afinarlo habría que guardar el historial de horarios.
    const disponibles = minutosDisponibles(dias, p.horarios, bloqueos.filter((b) => !b.profesionalId || b.profesionalId === p.id));
    const citados = suyas.filter((c) => c.estado !== "CANCELADA").reduce((s, c) => s + (c.fin.getTime() - c.inicio.getTime()) / 60_000, 0);
    return { id: p.id, nombre: p.nombre, ...t, disponibles, citados, ocupacion: disponibles ? Math.min(100, (100 * citados) / disponibles) : null };
  });
  const porServicio = servicios
    .map((s) => {
      const t = vacio();
      delMes.filter((c) => c.servicioId === s.id).forEach((c) => apuntar(c, t));
      return { id: s.id, nombre: s.nombre, ...t, citas: t.atendidas + t.noPresentadas + t.pendientes };
    })
    .filter((s) => s.citas + s.canceladas > 0)
    .sort((a, b) => b.citas - a.citas);

  const [disponibles, citados] = [porProfesional.reduce((s, p) => s + p.disponibles, 0), porProfesional.reduce((s, p) => s + p.citados, 0)];
  return {
    mes,
    total: porMes.get(mes)!,
    anterior: porMes.get(sumarMeses(mes, -1))!,
    ocupacion: disponibles ? Math.min(100, (100 * citados) / disponibles) : null,
    tendencia: meses.map((m) => ({ mes: m, ...porMes.get(m)! })),
    porProfesional,
    porServicio,
  };
}
