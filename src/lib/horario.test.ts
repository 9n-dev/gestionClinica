import { expect, it } from "vitest";
import { resumirHorario } from "./horario";

const t = (diaSemana: number, desde: number, hasta: number) => ({ diaSemana, minInicio: desde * 60, minFin: hasta * 60 });

it("une los tramos de todos los profesionales y agrupa los días seguidos con el mismo horario", () => {
  const laura = [1, 2, 3, 4, 5].flatMap((d) => [t(d, 9, 14), t(d, 16, 20)]).concat(t(6, 9, 13));
  const marcos = [1, 2, 3, 4, 5].flatMap((d) => [t(d, 9, 14), t(d, 16, 20)]);
  expect(resumirHorario([...laura, ...marcos])).toEqual({
    texto: [
      { dias: "Lunes a viernes", horas: "9:00 – 14:00 y 16:00 – 20:00" },
      { dias: "Sábado", horas: "9:00 – 13:00" },
      { dias: "Domingo", horas: "Cerrado" },
    ],
    schema: ["Mo-Fr 09:00-14:00", "Mo-Fr 16:00-20:00", "Sa 09:00-13:00"],
  });
});

it("funde tramos que se pisan o se tocan y separa los días que no coinciden", () => {
  // Lunes: uno de 9 a 13 y otro de 12 a 15 → la clínica abre de 9 a 15. Martes cerrado. Miércoles solo tarde.
  expect(resumirHorario([t(1, 9, 13), t(1, 12, 15), t(1, 15, 17), t(3, 16, 20)]).texto).toEqual([
    { dias: "Lunes", horas: "9:00 – 17:00" },
    { dias: "Martes", horas: "Cerrado" },
    { dias: "Miércoles", horas: "16:00 – 20:00" },
    { dias: "Jueves a domingo", horas: "Cerrado" },
  ]);
});
