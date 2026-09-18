import { firmaSvixValida, registrarEvento } from "@/lib/emails/rebotes";

export const dynamic = "force-dynamic";

// Resend → Webhooks → https://tu-dominio/api/resend/webhook, con los eventos email.bounced y email.complained.
export async function POST(req: Request) {
  const cuerpo = await req.text(); // la firma va sobre el texto tal cual llega
  if (!firmaSvixValida(req.headers, cuerpo)) return new Response("Firma no válida", { status: 403 });
  await registrarEvento(JSON.parse(cuerpo));
  return new Response(null, { status: 204 });
}
