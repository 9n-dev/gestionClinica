import { expect, it } from "vitest";
import { rangoDe } from "./agenda";

it("la agenda pinta de 9 a 20 como mínimo y se estira, a horas en punto, si un horario o una cita se sale", () => {
  expect(rangoDe([])).toEqual({ desde: 540, hasta: 1200 });
  expect(rangoDe([{ desde: 8 * 60 + 30, hasta: 9 * 60 }, { desde: 20 * 60, hasta: 20 * 60 + 45 }])).toEqual({ desde: 480, hasta: 1260 });
});
