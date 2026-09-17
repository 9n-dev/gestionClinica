import { TZDate } from "@date-fns/tz";

// Todas las fechas se guardan en UTC; la clínica vive en hora de Madrid
// (el servidor de Vercel corre en UTC, así que nunca se usa la hora local).
export const ZONA = "Europe/Madrid";

/** Día de calendario en Madrid, "YYYY-MM-DD". */
export type Dia = string;

export const esDia = (s: unknown): s is Dia =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

/** Instante UTC de un día de Madrid + minutos desde medianoche. */
export function aInstante(dia: Dia, minutos = 0): Date {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(new TZDate(a, m - 1, d, 0, minutos, ZONA).getTime());
}

/** Día de Madrid en el que cae un instante. */
export function diaDe(fecha: Date): Dia {
  const t = new TZDate(fecha.getTime(), ZONA);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

/** Minutos desde medianoche, en hora de Madrid. */
export function minutosDe(fecha: Date): number {
  const t = new TZDate(fecha.getTime(), ZONA);
  return t.getHours() * 60 + t.getMinutes();
}

export const hoy = (): Dia => diaDe(new Date());

/** Aritmética de días sobre el calendario (sin horas, inmune al cambio de hora). */
export function sumarDias(dia: Dia, n: number): Dia {
  const f = new Date(`${dia}T12:00:00Z`);
  f.setUTCDate(f.getUTCDate() + n);
  return f.toISOString().slice(0, 10);
}

/** 1 = lunes … 7 = domingo. */
export function diaSemana(dia: Dia): number {
  return new Date(`${dia}T12:00:00Z`).getUTCDay() || 7;
}

export const lunesDe = (dia: Dia): Dia => sumarDias(dia, 1 - diaSemana(dia));

const fmt = (o: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, ...o });
  return (d: Date) => f.format(d);
};

export const formatoHora = fmt({ hour: "2-digit", minute: "2-digit" });
export const formatoFechaLarga = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const formatoFechaCorta = fmt({ weekday: "short", day: "numeric", month: "short" });
export const formatoFechaHora = fmt({ day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Formatea un Dia ("2026-09-18") sin pasar por zonas horarias. */
export const formatoDia = (dia: Dia, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", ...o }).format(new Date(`${dia}T12:00:00Z`));

export const minutosAHora = (min: number) =>
  `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

export const formatoPrecio = (cent: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: cent % 100 ? 2 : 0 }).format(cent / 100);
