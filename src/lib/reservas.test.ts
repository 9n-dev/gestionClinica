import { rmSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { aInstante, formatoHora, hoy, sumarDias } from "./fechas";

// Base de datos SQLite temporal con el esquema real: aquí se prueba lo que la BD garantiza.
const RUTA = `/tmp/podologia-test-${process.pid}.db`;
process.env.DATABASE_URL = `file:${RUTA}`;
process.env.RESEND_API_KEY = "";
const { prisma } = await import("./db");
const { migrar } = await import("./migraciones");
const { sembrar } = await import("./seed-datos");
const { crearCita, moverCita, cancelarCita } = await import("./reservas");
const { fusionarPacientes, suprimirPaciente } = await import("./pacientes");

// Próximo lunes y martes, siempre en el futuro y con horario completo.
const LUNES = (() => { let d = sumarDias(hoy(), 1); while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 1) d = sumarDias(d, 1); return d; })();
const MARTES = sumarDias(LUNES, 1);
const paciente = { nombre: "Paciente Prueba", telefono: "611111111", email: null };

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  await migrar();
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

describe("derecho de supresión", () => {
  it("vacía los datos del paciente, de sus citas y sus emails; las citas se quedan y quien vuelva a reservar es un paciente nuevo", async () => {
    const datos = { nombre: "Marta Olvido Ruiz", telefono: "633333333", email: "marta@correo.test", servicio: "consulta-general", profesional: "marcos-ortiz", dia: sumarDias(LUNES, 3) };
    const r = await crearCita({ ...datos, hora: "09:00" }, true);
    if (!r.ok) throw new Error(r.error);
    const { pacienteId } = await prisma.cita.findUniqueOrThrow({ where: { id: r.id } });

    // Con una cita pendiente no se puede: primero hay que cancelarla
    expect((await suprimirPaciente(pacienteId)).ok).toBe(false);
    await cancelarCita({ id: r.id });
    expect(await prisma.emailEnviado.count({ where: { citaId: r.id } })).toBeGreaterThan(0);
    await prisma.mensajeEnviado.create({ data: { tipo: "RECORDATORIO", canal: "CONSOLA", para: "+34633333333", texto: "Marta, te recordamos tu cita", citaId: r.id } });
    expect((await suprimirPaciente(pacienteId)).ok).toBe(true);

    const todo = JSON.stringify([
      await prisma.paciente.findUniqueOrThrow({ where: { id: pacienteId } }),
      await prisma.cita.findUniqueOrThrow({ where: { id: r.id } }),
      await prisma.emailEnviado.findMany({ where: { OR: [{ citaId: r.id }, { para: datos.email }] } }),
      await prisma.mensajeEnviado.findMany(),
    ]);
    for (const dato of ["Marta", "Olvido", "633333333", "marta@correo.test"]) expect(todo).not.toContain(dato);
    expect((await prisma.paciente.findUniqueOrThrow({ where: { id: pacienteId } })).eliminadoAt).not.toBeNull();

    const otra = await crearCita({ ...datos, hora: "10:00" }, true);
    if (!otra.ok) throw new Error(otra.error);
    expect((await prisma.cita.findUniqueOrThrow({ where: { id: otra.id } })).pacienteId).not.toBe(pacienteId);
  });
});

describe("servicios por profesional", () => {
  it("quien no hace un servicio no recibe citas de ese servicio: ni elegido, ni por «cualquiera», ni moviéndole una", async () => {
    const dia = sumarDias(LUNES, 7);
    const estudio = { ...paciente, servicio: "estudio-de-la-pisada", dia };
    await prisma.profesional.update({ where: { slug: "laura-serrano" }, data: { servicios: { disconnect: { slug: "estudio-de-la-pisada" } } } });

    expect((await crearCita({ ...estudio, profesional: "laura-serrano", hora: "09:00" }, true)).ok).toBe(false);
    // «cualquiera»: dos a la misma hora. El primero va a Marcos; para el segundo solo quedaría Laura, que no lo hace.
    const a = await crearCita({ ...estudio, profesional: "cualquiera", hora: "10:00" }, true);
    if (!a.ok) throw new Error(a.error);
    expect((await citaDe(a.id)).profesional.slug).toBe("marcos-ortiz");
    expect((await crearCita({ ...estudio, profesional: "cualquiera", hora: "10:00" }, true)).ok).toBe(false);
    expect((await moverCita(a.id, { profesional: "laura-serrano", dia, hora: "12:00" })).ok).toBe(false);
    // Lo demás lo sigue haciendo
    expect((await crearCita({ ...paciente, servicio: "quiropodia", profesional: "laura-serrano", dia, hora: "09:00" }, true)).ok).toBe(true);
  });
});

describe("lista de espera", () => {
  it("propone, por orden de llegada, a quien le cabe el hueco con ese profesional", async () => {
    const { candidatosPara } = await import("./espera");
    const [laura, marcos] = await Promise.all(["laura-serrano", "marcos-ortiz"].map((slug) => prisma.profesional.findUniqueOrThrow({ where: { slug } })));
    const servicio = async (slug: string) => (await prisma.servicio.findUniqueOrThrow({ where: { slug } })).id;
    const apuntar = async (nombre: string, slug: string, profesionalId: string | null, creadoAt: string) =>
      prisma.enEspera.create({ data: { servicioId: await servicio(slug), profesionalId, creadoAt: new Date(creadoAt), pacienteId: (await prisma.paciente.create({ data: { nombre, nombreNorm: nombre.toLowerCase(), telefono: "655555555" } })).id } });
    await apuntar("Segunda", "consulta-general", null, "2026-09-02");
    await apuntar("Primera", "quiropodia", laura.id, "2026-09-01");
    await apuntar("No cabe", "estudio-de-la-pisada", null, "2026-08-01"); // 60 min en un hueco de 45
    await apuntar("Quiere a Marcos", "consulta-general", marcos.id, "2026-08-01");
    const yaTieneCita = await apuntar("Ya atendida", "quiropodia", null, "2026-08-01");
    await prisma.enEspera.update({ where: { id: yaTieneCita.id }, data: { atendidoAt: new Date() } });

    const inicio = aInstante(sumarDias(LUNES, 14), 600);
    const hueco = { profesionalId: laura.id, inicio, fin: new Date(inicio.getTime() + 45 * 60_000) };
    expect((await candidatosPara(hueco)).map((e) => e.paciente.nombre)).toEqual(["Primera", "Segunda"]);
  });
});

describe("fusionar fichas", () => {
  it("junta las citas de quien reservó con dos nombres desde el mismo móvil, y no deja fusionar a dos desconocidos", async () => {
    const dia = sumarDias(LUNES, 21);
    const base = { telefono: "644444444", servicio: "consulta-general", profesional: "marcos-ortiz", dia };
    const [pepe, jose, otro] = [
      await crearCita({ ...base, nombre: "Pepe Gómez", email: null, hora: "09:00" }, true),
      await crearCita({ ...base, nombre: "José Gómez Lara", email: "jose@correo.test", hora: "10:00" }, true),
      await crearCita({ ...base, telefono: "655555000", nombre: "Otra Persona", email: null, hora: "11:00" }, true),
    ];
    if (!pepe.ok || !jose.ok || !otro.ok) throw new Error("no se crearon las citas");
    const fichaDe = async (citaId: string) => (await prisma.cita.findUniqueOrThrow({ where: { id: citaId } })).pacienteId;
    const [idPepe, idJose, idOtro] = await Promise.all([pepe.id, jose.id, otro.id].map(fichaDe));

    expect((await fusionarPacientes(idJose, idOtro)).ok).toBe(false);
    expect(await fusionarPacientes(idJose, idPepe)).toEqual({ ok: true });
    expect(await prisma.paciente.findUnique({ where: { id: idPepe } })).toBeNull();
    const ficha = await prisma.paciente.findUniqueOrThrow({ where: { id: idJose }, include: { citas: true } });
    expect(ficha).toMatchObject({ nombre: "José Gómez Lara", email: "jose@correo.test" });
    expect(ficha.citas.map((c) => c.id).sort()).toEqual([pepe.id, jose.id].sort());
  });
});

describe("hallazgos de la auditoría de seguridad", () => {
  it("una reserva por la web no cambia el email de la ficha de un paciente que ya lo tenía; desde el panel, sí", async () => {
    const dia = sumarDias(LUNES, 28);
    const base = { nombre: "Víctima Conocida", telefono: "677000001", servicio: "consulta-general", profesional: "laura-serrano", dia };
    const ficha = async (r: Awaited<ReturnType<typeof crearCita>>) => { if (!r.ok) throw new Error(r.error); return (await prisma.cita.findUniqueOrThrow({ where: { id: r.id }, include: { paciente: true } })).paciente; };
    expect((await ficha(await crearCita({ ...base, email: "la-buena@correo.test", hora: "09:00" }, true))).email).toBe("la-buena@correo.test");
    // Alguien que sabe su nombre y su teléfono reserva por la web con otro email: la ficha no se toca
    expect((await ficha(await crearCita({ ...base, email: "atacante@correo.test", hora: "10:00" }))).email).toBe("la-buena@correo.test");
    // Recepción sí puede corregirlo al dar una cita
    expect((await ficha(await crearCita({ ...base, email: "la-nueva@correo.test", hora: "11:00" }, true))).email).toBe("la-nueva@correo.test");
  });

  it("con el enlace del email no se cancela una cita que ya ha pasado", async () => {
    const r = await crearCita({ ...paciente, servicio: "consulta-general", profesional: "marcos-ortiz", dia: sumarDias(LUNES, 28), hora: "12:00" }, true);
    if (!r.ok) throw new Error(r.error);
    await prisma.cita.update({ where: { id: r.id }, data: { inicio: new Date(Date.now() - 86_400_000), fin: new Date(Date.now() - 86_400_000 + 1_800_000) } });
    expect(await cancelarCita({ tokenCancelacion: r.token })).toBe(false);
    expect((await citaDe(r.id)).estado).toBe("CONFIRMADA");
    expect(await cancelarCita({ id: r.id })).toBe(true); // la clínica sí puede, desde el panel
  });
});
