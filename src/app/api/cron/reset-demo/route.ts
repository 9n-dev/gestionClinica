import { MODO_DEMO } from "@/lib/clinica";
import { cronAutorizado } from "@/lib/cron";
import { prisma } from "@/lib/db";
import { sembrar } from "@/lib/seed-datos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Reinicio diario de la demo: mismos datos que `npm run seed`.
export async function GET(req: Request) {
  // Borra TODOS los datos. En una instalación real (sin MODO_DEMO) esta ruta no existe, aunque el cron siga en vercel.json.
  if (!MODO_DEMO) return new Response("Solo en modo demo", { status: 404 });
  if (!cronAutorizado(req)) return new Response("No autorizado", { status: 401 });
  return Response.json(await sembrar(prisma));
}
