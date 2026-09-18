import { timingSafeEqual } from "node:crypto";
import { alertar } from "./alertas";

/** Vercel Cron envía "Authorization: Bearer <CRON_SECRET>". Sin secreto configurado, nadie pasa. */
export function cronAutorizado(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

/** Un cron que falla no avisa a nadie por sí solo: aquí se avisa y se responde 500 para que Vercel lo marque. */
export async function conAlerta(nombre: string, tarea: () => Promise<unknown>) {
  try {
    return Response.json(await tarea());
  } catch (e) {
    await alertar(`Ha fallado el cron ${nombre}`, e instanceof Error ? (e.stack ?? e.message) : String(e));
    return Response.json({ error: "El cron ha fallado" }, { status: 500 });
  }
}
