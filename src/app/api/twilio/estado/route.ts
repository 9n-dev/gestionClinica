import { estadoDeTwilio, firmaValida } from "@/lib/mensajes";

export const dynamic = "force-dynamic";

// Twilio llama aquí con cada cambio de estado de un WhatsApp (la URL va en StatusCallback al enviarlo).
export async function POST(req: Request) {
  const parametros = Object.fromEntries([...(await req.formData())].map(([k, v]) => [k, String(v)]));
  if (!firmaValida(req.headers.get("x-twilio-signature"), parametros)) return new Response("Firma no válida", { status: 403 });
  await estadoDeTwilio(parametros);
  return new Response(null, { status: 204 });
}
