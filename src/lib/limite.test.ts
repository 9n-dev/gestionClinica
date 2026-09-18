import { rmSync } from "node:fs";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

const RUTA = `/tmp/podologia-test-limite-${process.pid}.db`;
process.env.DATABASE_URL = `file:${RUTA}`;
const { prisma } = await import("./db");
const { migrar } = await import("./migraciones");
const { agotado, borrarIntentosViejos, ipDe, permitido } = await import("./limite");

beforeAll(async () => void (await migrar()));
afterAll(async () => {
  await prisma.$disconnect();
  rmSync(RUTA, { force: true });
});

it("deja pasar hasta el máximo, corta después y vuelve a dejar en la ventana siguiente", async () => {
  const reloj = vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 18, 10, 1));
  const intentos = [];
  for (let i = 0; i < 5; i++) intentos.push(await permitido("prueba:a", 3, 15));
  expect(intentos).toEqual([true, true, true, false, false]);
  expect(await agotado("prueba:a", 3, 15)).toBe(true);
  expect(await permitido("prueba:b", 3, 15)).toBe(true); // otra clave no se entera
  expect(await agotado("prueba:b", 3, 15)).toBe(false);

  reloj.mockReturnValue(Date.UTC(2026, 8, 18, 10, 16));
  expect(await agotado("prueba:a", 3, 15)).toBe(false);
  expect(await permitido("prueba:a", 3, 15)).toBe(true);

  reloj.mockReturnValue(Date.UTC(2026, 8, 20, 10, 0));
  expect((await borrarIntentosViejos()).count).toBe(3);
  reloj.mockRestore();
});

it("la IP es la primera de x-forwarded-for", () => {
  expect(ipDe(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  expect(ipDe(new Headers())).toBe("desconocida");
});
