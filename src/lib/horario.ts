import { cache } from "react";
import { prisma } from "./db";
import { minutosAHora } from "./fechas";

// Horario de apertura que se enseña en la web y en el JSON-LD: sale de los horarios de los profesionales
// activos (los que se editan en Configuración), así que no hay una segunda copia que mantener a mano.

type Tramo = { diaSemana: number; minInicio: number; minFin: number };
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_SCHEMA = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function resumirHorario(tramos: Tramo[]) {
  // Por día (1 = lunes), la unión de los tramos de todos: se funden los que se pisan o se tocan.
  const porDia = DIAS.map((_, i) => {
    const unidos: [number, number][] = [];
    for (const t of tramos.filter((x) => x.diaSemana === i + 1).sort((a, b) => a.minInicio - b.minInicio)) {
      const ultimo = unidos.at(-1);
      if (ultimo && t.minInicio <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], t.minFin);
      else unidos.push([t.minInicio, t.minFin]);
    }
    return unidos;
  });

  // Días seguidos con el mismo horario van juntos: "Lunes a viernes".
  const grupos: { desde: number; hasta: number; tramos: [number, number][] }[] = [];
  porDia.forEach((tramosDia, i) => {
    const ultimo = grupos.at(-1);
    if (ultimo && JSON.stringify(ultimo.tramos) === JSON.stringify(tramosDia)) ultimo.hasta = i;
    else grupos.push({ desde: i, hasta: i, tramos: tramosDia });
  });

  const rango = (nombres: string[], g: { desde: number; hasta: number }, union: string) =>
    g.desde === g.hasta ? nombres[g.desde] : `${nombres[g.desde]}${union}${nombres[g.hasta]}`;
  const hora = (min: number) => minutosAHora(min).padStart(5, "0");
  return {
    texto: grupos.map((g) => ({
      dias: rango(DIAS, g, " a ").replace(/ a (\p{Lu})/u, (_, l: string) => ` a ${l.toLowerCase()}`),
      horas: g.tramos.length ? g.tramos.map(([a, b]) => `${minutosAHora(a)} – ${minutosAHora(b)}`).join(" y ") : "Cerrado",
    })),
    schema: grupos.flatMap((g) => g.tramos.map(([a, b]) => `${rango(DIAS_SCHEMA, g, "-")} ${hora(a)}-${hora(b)}`)),
  };
}

/** cache(): pie, página y JSON-LD lo piden en la misma petición y sale una sola consulta. */
export const horarioPublico = cache(async () => resumirHorario(await prisma.horarioLaboral.findMany({ where: { profesional: { activo: true } } })));
