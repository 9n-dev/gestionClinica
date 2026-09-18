import { rmSync } from "node:fs";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

const RUTA = `/tmp/podologia-test-retencion-${process.pid}.db`;
process.env.DATABASE_URL = `file:${RUTA}`;
const { prisma } = await import("./db");
const { migrar } = await import("./migraciones");
const { aplicarRetencion } = await import("./retencion");

const AHORA = new Date("2026-09-18T06:00:00Z");
const hace = (meses: number) => new Date(Date.UTC(2026, 8 - meses, 18, 9));
let n = 0;

/** Un paciente con una cita en esa fecha. */
async function cita(nombre: string, inicio: Date, estado: "ATENDIDA" | "CANCELADA" = "ATENDIDA") {
  const id = `c${++n}`;
  await prisma.cita.create({
    data: {
      id, inicio, fin: new Date(inicio.getTime() + 1_800_000), estado, canceladaAt: estado === "CANCELADA" ? inicio : null, tokenCancelacion: id,
      pacienteNombre: nombre, pacienteTelefono: "600000000", pacienteEmail: "p@correo.test",
      servicio: { connect: { id: "s" } }, profesional: { connect: { id: "p" } },
      paciente: { connectOrCreate: { where: { telefono_nombreNorm: { telefono: "600000000", nombreNorm: nombre.toLowerCase() } }, create: { nombre, nombreNorm: nombre.toLowerCase(), telefono: "600000000", creadoAt: inicio } } },
      emails: { create: { tipo: "CONFIRMACION_PACIENTE", canal: "CONSOLA", para: "p@correo.test", asunto: `Cita de ${nombre}`, html: nombre, enviadoAt: inicio } },
      mensajes: { create: { tipo: "RECORDATORIO", canal: "CONSOLA", para: "+34600000000", texto: nombre, enviadoAt: inicio } },
    },
  });
  return id;
}

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  await migrar();
  await prisma.profesional.create({ data: { id: "p", slug: "p", nombre: "P", titulo: "t", bio: "b" } });
  await prisma.servicio.create({ data: { id: "s", slug: "s", nombre: "S", descripcion: "d", duracionMin: 30, precioCent: 4000 } });
});
afterAll(async () => {
  await prisma.$disconnect();
  rmSync(RUTA, { force: true });
});

it("borra lo que ha cumplido su plazo y no toca lo demás", async () => {
  const canceladaVieja = await cita("Vieja Cancelada", hace(13), "CANCELADA");
  const canceladaReciente = await cita("Reciente Cancelada", hace(11), "CANCELADA");
  const atendidaVieja = await cita("Antiguo Paciente", hace(70));
  await cita("Paciente Fiel", hace(70));
  await cita("Paciente Fiel", hace(2)); // vino hace poco: no está inactivo aunque su primera cita sea antigua
  for (const [meses, email] of [[25, "viejo"], [23, "reciente"]] as const)
    await prisma.auditoria.create({ data: { usuarioEmail: email, accion: "VER", entidad: "paciente", creadoAt: hace(meses) } });

  process.env.RETENCION_PACIENTES_MESES = "60";
  const r = await aplicarRetencion(AHORA);
  // emails y mensajes: 2 por antigüedad; los del paciente anonimizado ya se los llevó su supresión
  expect(r).toEqual({ citasCanceladas: 1, pacientesInactivos: 1, emails: 2, mensajes: 2, actividad: 1 });

  // Citas canceladas: 12 meses
  expect(await prisma.cita.findUnique({ where: { id: canceladaVieja } })).toBeNull();
  expect(await prisma.cita.findUnique({ where: { id: canceladaReciente } })).not.toBeNull();
  // Pacientes sin visitas en 60 meses: anonimizados, con su cita en pie
  expect(await prisma.cita.findUniqueOrThrow({ where: { id: atendidaVieja }, include: { paciente: true } })).toMatchObject({ pacienteNombre: "Paciente eliminado", paciente: { telefono: "", eliminadoAt: AHORA } });
  expect(await prisma.paciente.count({ where: { nombre: "Paciente Fiel", eliminadoAt: null } })).toBe(1);
  // Emails y mensajes guardados: 12 meses. Quedan los de los últimos 11 y 2 meses.
  expect((await prisma.emailEnviado.findMany()).map((e) => e.html).sort()).toEqual(["Paciente Fiel", "Reciente Cancelada"]);
  expect(await prisma.mensajeEnviado.count()).toBe(2);
  // Registro de actividad: 24 meses. Y la retención deja su propio apunte, sin usuario.
  expect((await prisma.auditoria.findMany({ orderBy: { creadoAt: "asc" } })).map((a) => `${a.usuarioEmail} ${a.accion}`)).toEqual(["reciente VER", "sistema BORRAR"]);

  expect(await aplicarRetencion(AHORA)).toEqual({ citasCanceladas: 0, pacientesInactivos: 0, emails: 0, mensajes: 0, actividad: 0 });
});

it("los pacientes inactivos no se tocan si la clínica no ha fijado un plazo", async () => {
  delete process.env.RETENCION_PACIENTES_MESES;
  await cita("Otro Antiguo", hace(120));
  expect((await aplicarRetencion(AHORA)).pacientesInactivos).toBe(0);
});
