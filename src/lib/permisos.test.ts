import { expect, it } from "vitest";
import { puedeGestionar } from "./permisos";

it("administración y recepción gestionan todo; un profesional, solo lo suyo y nada de toda la clínica", () => {
  const admin = { rol: "ADMIN" as const, profesionalId: "laura" }; // la directora también pasa consulta
  const recepcion = { rol: "EQUIPO" as const, profesionalId: null };
  const marcos = { rol: "EQUIPO" as const, profesionalId: "marcos" };
  for (const de of ["laura", "marcos", null]) {
    expect(puedeGestionar(admin, de)).toBe(true);
    expect(puedeGestionar(recepcion, de)).toBe(true);
  }
  expect(puedeGestionar(marcos, "marcos")).toBe(true);
  expect(puedeGestionar(marcos, "laura")).toBe(false);
  expect(puedeGestionar(marcos, null)).toBe(false);
});
