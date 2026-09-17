import { timingSafeEqual } from "node:crypto";

/** Vercel Cron envía "Authorization: Bearer <CRON_SECRET>". Sin secreto configurado, nadie pasa. */
export function cronAutorizado(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}
