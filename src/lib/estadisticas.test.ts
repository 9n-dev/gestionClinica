import { expect, it } from "vitest";
import { minutosDisponibles } from "./estadisticas";
import { aInstante } from "./fechas";

const tramos = [1, 2, 3, 4, 5].flatMap((diaSemana) => [{ diaSemana, minInicio: 9 * 60, minFin: 14 * 60 }, { diaSemana, minInicio: 16 * 60, minFin: 20 * 60 }]);
const SEMANA = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"]; // de lunes a domingo

it("suma el horario de los días trabajados", () => {
  expect(minutosDisponibles(SEMANA, tramos, [])).toBe(5 * 9 * 60);
});

it("resta los bloqueos, sin contar dos veces los que se pisan ni lo que cae fuera del horario", () => {
  const bloqueos = [
    { inicio: aInstante("2026-09-21", 13 * 60), fin: aInstante("2026-09-21", 17 * 60) }, // lunes 13-17: quita 13-14 y 16-17, la comida no cuenta
    { inicio: aInstante("2026-09-21", 16 * 60), fin: aInstante("2026-09-21", 16 * 60 + 30) }, // dentro del anterior
    { inicio: aInstante("2026-09-23"), fin: aInstante("2026-09-25") }, // vacaciones miércoles y jueves enteros
    { inicio: aInstante("2026-09-26", 9 * 60), fin: aInstante("2026-09-26", 13 * 60) }, // sábado: no se trabaja, no resta
  ];
  expect(minutosDisponibles(SEMANA, tramos, bloqueos)).toBe(5 * 9 * 60 - 2 * 60 - 2 * 9 * 60);
});

it("el cambio de hora de octubre no descuadra el día", () => {
  expect(minutosDisponibles(["2026-10-25"], [{ diaSemana: 7, minInicio: 0, minFin: 5 * 60 }], [])).toBe(5 * 60);
});
