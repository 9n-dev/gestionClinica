import { rmSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { aInstante, formatoHora, hoy, sumarDias } from "./fechas";

// Base de datos SQLite temporal con el esquema real: aquí se prueba lo que la BD garantiza.
const RUTA = `/tmp/podologia-test-${process.pid}.db`;
process.env.DATABASE_URL = `file:${RUTA}`;
process.env.RESEND_API_KEY = "";
const { prisma } = await import("./db");
const { crearTablasSiFaltan } = await import("./migraciones");
const { sembrar } = await import("./seed-datos");
const { crearCita, moverCita, cancelarCita } = await import("./reservas");

// Próximo lunes y martes, siempre en el futuro y con horario completo.
const LUNES = (() => { let d = sumarDias(hoy(), 1); while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 1) d = sumarDias(d, 1); return d; })();
const MARTES = sumarDias(LUNES, 1);
const paciente = { nombre: "Paciente Prueba", telefono: "611111111", email: null };

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  await crearTablasSiFaltan(prisma);
  await sembrar(prisma, 0);
  await prisma.bloqueo.deleteMany(); // los bloqueos del seed caen en días que usan los tests
});
afterAll(async () => {
  await prisma.$disconnect();
  rmSync(RUTA, { force: true });
});

const citaDe = (id: string) => prisma.cita.findUniqueOrThrow({ where: { id }, include: { profesional: true, franjas: true } });

describe("moverCita", () => {
  it("mueve la cita, libera las franjas viejas y ocupa las nuevas", async () => {
    const r = await crearCita({ ...paciente, servicio: "quiropodia", profesional: "laura-serrano", dia: LUNES, hora: "10:00" }, true);
    if (!r.ok) throw new Error(r.error);
    expect(await moverCita(r.id, { profesional: "laura-serrano", dia: LUNES, hora: "16:00" })).toEqual({ ok: true });
    const c = await citaDe(r.id);
    expect(formatoHora(c.inicio)).toBe("16:00");
    expect(c.franjas.map((f) => formatoHora(f.inicio))).toEqual(["16:00", "16:15", "16:30"]);
    // el hueco de las 10:00 vuelve a estar libre
    const otra = await crearCita({ ...paciente, servicio: "quiropodia", profesional: "laura-serrano", dia: LUNES, hora: "10:00" }, true);
    expect(otra.ok).toBe(true);
  });

  it("no la mueve encima de otra cita ni fuera de horario, y la deja como estaba", async () => {
    const a = await crearCita({ ...paciente, servicio: "consulta-general", profesional: "marcos-ortiz", dia: MARTES, hora: "09:00" }, true);
    const b = await crearCita({ ...paciente, servicio: "consulta-general", profesional: "marcos-ortiz", dia: MARTES, hora: "11:00" }, true);
    if (!a.ok || !b.ok) throw new Error("no se crearon las citas");
    for (const hora of ["09:15", "08:45", "13:45", "14:30"]) {
      const r = await moverCita(b.id, { profesional: "marcos-ortiz", dia: MARTES, hora });
      expect(r.ok, hora).toBe(false);
    }
    const c = await citaDe(b.id);
    expect(formatoHora(c.inicio)).toBe("11:00");
    expect(c.franjas).toHaveLength(2);
  });

  it("puede cambiar de profesional, pero no al que no trabaja ese día", async () => {
    const SABADO = sumarDias(LUNES, 5);
    const r = await crearCita({ ...paciente, servicio: "consulta-general", profesional: "laura-serrano", dia: SABADO, hora: "09:00" }, true);
    if (!r.ok) throw new Error(r.error);
    expect((await moverCita(r.id, { profesional: "marcos-ortiz", dia: SABADO, hora: "09:00" })).ok).toBe(false);
    expect((await moverCita(r.id, { profesional: "marcos-ortiz", dia: LUNES, hora: "12:00" })).ok).toBe(true);
    const c = await citaDe(r.id);
    expect(c.profesional.slug).toBe("marcos-ortiz");
    expect(c.franjas.every((f) => f.profesionalId === c.profesionalId)).toBe(true);
  });

  it("mover a su misma hora no hace nada; una cancelada no se mueve", async () => {
    const r = await crearCita({ ...paciente, servicio: "consulta-general", profesional: "laura-serrano", dia: MARTES, hora: "17:00" }, true);
    if (!r.ok) throw new Error(r.error);
    expect(await moverCita(r.id, { profesional: "laura-serrano", dia: MARTES, hora: "17:00" })).toEqual({ ok: true });
    await cancelarCita({ id: r.id });
    expect((await moverCita(r.id, { profesional: "laura-serrano", dia: MARTES, hora: "18:00" })).ok).toBe(false);
    expect((await citaDe(r.id)).franjas).toHaveLength(0);
  });

  it("desde la web no se puede reservar con menos de 2 h de antelación; desde el panel sí", async () => {
    const dentroDeUnaHora = new Date(Date.now() + 3_600_000);
    const min = Math.ceil((dentroDeUnaHora.getTime() - aInstante(hoy()).getTime()) / 60_000 / 15) * 15;
    // solo si cae en horario de mañana o tarde de un lunes a viernes; si no, la comprobación no aplica
    const dia = hoy();
    const ds = new Date(`${dia}T12:00:00Z`).getUTCDay();
    const enHorario = ds >= 1 && ds <= 5 && ((min >= 540 && min + 30 <= 840) || (min >= 960 && min + 30 <= 1200));
    if (!enHorario) return;
    const hora = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    const web = await crearCita({ ...paciente, servicio: "consulta-general", profesional: "laura-serrano", dia, hora }, false);
    expect(web.ok).toBe(false);
    const panel = await crearCita({ ...paciente, servicio: "consulta-general", profesional: "laura-serrano", dia, hora }, true);
    expect(panel.ok).toBe(true);
  });
});

describe("paciente de la cita", () => {
  const reservar = (nombre: string, hora: string, email: string | null = null) =>
    crearCita({ nombre, telefono: "622222222", email, servicio: "consulta-general", profesional: "laura-serrano", dia: sumarDias(LUNES, 2), hora }, true);
  const pacienteDe = async (r: Awaited<ReturnType<typeof reservar>>) => {
    if (!r.ok) throw new Error(r.error);
    return (await prisma.cita.findUniqueOrThrow({ where: { id: r.id }, include: { paciente: true } })).paciente;
  };

  it("mismo teléfono y mismo nombre (con o sin acentos) es el mismo paciente; otro nombre, otro paciente", async () => {
    const a = await pacienteDe(await reservar("José Pérez Núñez", "09:00"));
    const b = await pacienteDe(await reservar("  jose  PEREZ nunez ", "10:00", "jose@ejemplo.com"));
    const hijo = await pacienteDe(await reservar("Hugo Pérez Núñez", "11:00"));
    expect(b.id).toBe(a.id);
    expect(b.nombre).toBe("José Pérez Núñez"); // se queda el nombre de la primera vez
    expect(b.email).toBe("jose@ejemplo.com"); // y el email más reciente
    expect(hijo.id).not.toBe(a.id);
  });
});
