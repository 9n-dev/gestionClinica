import { cronAutorizado } from "@/lib/cron";
import { prisma } from "@/lib/db";
import { sembrar } from "@/lib/seed-datos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Reinicio diario de la demo: mismos datos que `npm run seed`.
export async function GET(req: Request) {
  if (!cronAutorizado(req)) return new Response("No autorizado", { status: 401 });
  return Response.json(await sembrar(prisma));
}
