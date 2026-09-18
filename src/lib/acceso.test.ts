import { rmSync } from "node:fs";
import { compare } from "bcryptjs";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

const RUTA = `/tmp/podologia-test-acceso-${process.pid}.db`;
process.env.DATABASE_URL = `file:${RUTA}`;
process.env.RESEND_API_KEY = "";
const { prisma } = await import("./db");
const { migrar } = await import("./migraciones");
const { enviarAcceso, ponerPassword, usuarioDeToken } = await import("./acceso");

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  await migrar();
});
afterAll(async () => {
  await prisma.$disconnect();
  rmSync(RUTA, { force: true });
});

// El token solo existe dentro del email: se saca de ahí, como haría la persona.
const tokenDelUltimoEmail = async () => {
  const e = await prisma.emailEnviado.findFirstOrThrow({ where: { tipo: "ACCESO" }, orderBy: { enviadoAt: "desc" } });
  return e.html.match(/\/panel\/acceso\/([\w-]+)/)![1];
};
const crear = (email: string, demo = false) => prisma.usuario.create({ data: { email, nombre: "Ana Prueba", passwordHash: "x", demo } });

it("el enlace pone la contraseña una sola vez y en la base de datos no está el token", async () => {
  const u = await crear("ana@ejemplo.com");
  await enviarAcceso(u, false);
  const token = await tokenDelUltimoEmail();
  expect((await prisma.usuario.findUniqueOrThrow({ where: { id: u.id } })).accesoTokenHash).not.toContain(token);

  expect(await ponerPassword("token-inventado", "una-contraseña-larga")).toBe(false);
  expect(await ponerPassword(token, "una-contraseña-larga")).toBe(true);
  expect(await ponerPassword(token, "otra-contraseña-larga")).toBe(false);
  const despues = await prisma.usuario.findUniqueOrThrow({ where: { id: u.id } });
  expect(await compare("una-contraseña-larga", despues.passwordHash)).toBe(true);
});

it("un enlace caducado o de un usuario de la demo no vale", async () => {
  const u = await crear("caducado@ejemplo.com");
  await enviarAcceso(u, false);
  const caducado = await tokenDelUltimoEmail();
  await prisma.usuario.update({ where: { id: u.id }, data: { accesoExpira: new Date(Date.now() - 1000) } });
  expect(await usuarioDeToken(caducado)).toBeNull();

  await enviarAcceso(await crear("demo@ejemplo.com", true), true);
  expect(await ponerPassword(await tokenDelUltimoEmail(), "una-contraseña-larga")).toBe(false);
});
