import { describe, expect, it } from "vitest";
import { calcularHuecos, franjasDe, solapan, type Tramo } from "./disponibilidad";
import { aInstante, formatoHora } from "./fechas";

// 2026-09-21 es lunes; 2026-09-26, sábado; 2026-09-27, domingo.
const LUNES = "2026-09-21";
const semana: Tramo[] = [1, 2, 3, 4, 5].flatMap((d) => [
  { diaSemana: d, minInicio: 540, minFin: 840 }, // 9:00-14:00
  { diaSemana: d, minInicio: 960, minFin: 1200 }, // 16:00-20:00
]);
const conSabado: Tramo[] = [...semana, { diaSemana: 6, minInicio: 540, minFin: 780 }];
const PASADO = new Date(0);
const horas = (hs: Date[]) => hs.map(formatoHora);
const intervalo = (dia: string, desde: number, hasta: number) => ({ inicio: aInstante(dia, desde), fin: aInstante(dia, hasta) });

describe("solapan", () => {
  const base = intervalo(LUNES, 600, 630); // 10:00-10:30
  it("detecta solape parcial, contenido y envolvente", () => {
    expect(solapan(base, intervalo(LUNES, 615, 645))).toBe(true);
    expect(solapan(base, intervalo(LUNES, 605, 610))).toBe(true);
    expect(solapan(base, intervalo(LUNES, 540, 720))).toBe(true);
  });
  it("citas contiguas no se solapan", () => {
    expect(solapan(base, intervalo(LUNES, 630, 660))).toBe(false);
    expect(solapan(base, intervalo(LUNES, 570, 600))).toBe(false);
  });
});

describe("franjasDe", () => {
  it("45 min ocupan 3 franjas de 15", () => {
    expect(horas(franjasDe(aInstante(LUNES, 600), 45))).toEqual(["10:00", "10:15", "10:30"]);
  });
  it("30 y 60 min ocupan 2 y 4", () => {
    expect(franjasDe(aInstante(LUNES, 600), 30)).toHaveLength(2);
    expect(franjasDe(aInstante(LUNES, 600), 60)).toHaveLength(4);
  });
});

describe("calcularHuecos", () => {
  const base = { dia: LUNES, duracionMin: 30, tramos: semana, ocupados: [], desde: PASADO };

  it("día libre: huecos cada 15 min en los dos tramos, sin pisar el cierre", () => {
    const h = horas(calcularHuecos(base));
    expect(h[0]).toBe("09:00");
    expect(h).toContain("13:30"); // última de la mañana: acaba a las 14:00
    expect(h).not.toContain("13:45");
    expect(h).not.toContain("14:00"); // mediodía cerrado
    expect(h).toContain("16:00");
    expect(h.at(-1)).toBe("19:30");
    expect(h).toHaveLength(19 + 15);
  });

  it("la duración limita la última hora de cada tramo", () => {
    const h = horas(calcularHuecos({ ...base, duracionMin: 60 }));
    expect(h).toContain("13:00");
    expect(h).not.toContain("13:15");
    expect(h.at(-1)).toBe("19:00");
  });

  it("una cita existente quita todos los inicios que la pisarían", () => {
    const ocupados = [intervalo(LUNES, 600, 645)]; // 10:00-10:45
    const h = horas(calcularHuecos({ ...base, ocupados }));
    expect(h).toContain("09:30"); // acaba justo a las 10:00
    for (const x of ["09:45", "10:00", "10:15", "10:30"]) expect(h).not.toContain(x);
    expect(h).toContain("10:45");
  });

  it("un servicio largo no cabe en un hueco corto entre dos citas", () => {
    const ocupados = [intervalo(LUNES, 540, 600), intervalo(LUNES, 645, 840)]; // libre 10:00-10:45
    const manana = (d: number) => horas(calcularHuecos({ ...base, duracionMin: d, ocupados })).filter((x) => x < "14:00");
    expect(manana(60)).toEqual([]);
    expect(manana(45)).toEqual(["10:00"]);
    expect(manana(30)).toEqual(["10:00", "10:15"]);
  });

  it("un bloqueo de varios días vacía el día entero", () => {
    const ocupados = [{ inicio: aInstante("2026-09-19"), fin: aInstante("2026-09-23") }];
    expect(calcularHuecos({ ...base, ocupados })).toEqual([]);
  });

  it("no ofrece horas anteriores a la antelación mínima", () => {
    const h = horas(calcularHuecos({ ...base, desde: aInstante(LUNES, 17 * 60 + 5) }));
    expect(h[0]).toBe("17:15");
  });

  it("sábado solo para quien tiene tramo de sábado; domingo nadie", () => {
    expect(calcularHuecos({ ...base, dia: "2026-09-26" })).toEqual([]);
    const sab = horas(calcularHuecos({ ...base, dia: "2026-09-26", tramos: conSabado }));
    expect(sab[0]).toBe("09:00");
    expect(sab.at(-1)).toBe("12:30");
    expect(calcularHuecos({ ...base, dia: "2026-09-27", tramos: conSabado })).toEqual([]);
  });

  it("las horas son de Madrid también tras el cambio de hora (UTC+2 → UTC+1)", () => {
    const verano = calcularHuecos({ ...base, dia: "2026-10-23" })[0]; // viernes, CEST
    const invierno = calcularHuecos({ ...base, dia: "2026-10-26" })[0]; // lunes, CET
    expect(verano.toISOString()).toBe("2026-10-23T07:00:00.000Z");
    expect(invierno.toISOString()).toBe("2026-10-26T08:00:00.000Z");
  });
});
