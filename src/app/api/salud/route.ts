import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Para un monitor de disponibilidad (UptimeRobot, Better Stack…): 200 si la app responde y llega a la base de datos. No cuenta nada más. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
