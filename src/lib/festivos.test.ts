import { expect, it } from "vitest";
import { festivosNacionales } from "./festivos";

it("los diez festivos nacionales, con el Viernes Santo de cada año en su sitio", () => {
  const de = (anio: number) => festivosNacionales(anio).find((f) => f.nombre === "Viernes Santo")!.dia;
  expect([2024, 2025, 2026, 2027, 2038].map(de)).toEqual(["2024-03-29", "2025-04-18", "2026-04-03", "2027-03-26", "2038-04-23"]);
  expect(festivosNacionales(2026).map((f) => f.dia)).toEqual(["2026-01-01", "2026-01-06", "2026-04-03", "2026-05-01", "2026-08-15", "2026-10-12", "2026-11-01", "2026-12-06", "2026-12-08", "2026-12-25"]);
});
