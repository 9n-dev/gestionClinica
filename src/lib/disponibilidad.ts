import { aInstante, diaSemana, type Dia } from "./fechas";

// Lógica pura de disponibilidad: sin base de datos ni reloj, todo entra por parámetro.

export const REJILLA_MIN = 15;
const MS_MIN = 60_000;

export type Intervalo = { inicio: Date; fin: Date };
export type Tramo = { diaSemana: number; minInicio: number; minFin: number };

/** Intervalos semiabiertos [inicio, fin): una cita que acaba a las 10:00 no pisa a la que empieza a las 10:00. */
export const solapan = (a: Intervalo, b: Intervalo) => a.inicio < b.fin && b.inicio < a.fin;

export const finDe = (inicio: Date, duracionMin: number) => new Date(inicio.getTime() + duracionMin * MS_MIN);

/** Inicios de las franjas de 15 min que ocupa una cita (45 min → 3 franjas). */
export function franjasDe(inicio: Date, duracionMin: number): Date[] {
  const n = Math.ceil(duracionMin / REJILLA_MIN);
  return Array.from({ length: n }, (_, i) => finDe(inicio, i * REJILLA_MIN));
}

/**
 * Horas de inicio libres de un profesional en un día de Madrid.
 * - tramos: su horario laboral (se filtra por día de la semana)
 * - ocupados: citas activas y bloqueos que le afectan
 * - desde: primer instante reservable (ahora + antelación mínima)
 */
export function calcularHuecos(p: {
  dia: Dia;
  duracionMin: number;
  tramos: Tramo[];
  ocupados: Intervalo[];
  desde: Date;
}): Date[] {
  const ds = diaSemana(p.dia);
  const huecos: Date[] = [];
  for (const t of p.tramos.filter((t) => t.diaSemana === ds).sort((a, b) => a.minInicio - b.minInicio)) {
    for (let m = t.minInicio; m + p.duracionMin <= t.minFin; m += REJILLA_MIN) {
      const inicio = aInstante(p.dia, m);
      const cita = { inicio, fin: finDe(inicio, p.duracionMin) };
      if (inicio >= p.desde && !p.ocupados.some((o) => solapan(cita, o))) huecos.push(inicio);
    }
  }
  return huecos;
}
