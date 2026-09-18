import { anotar } from "@/lib/auditoria";
import { requerirSesion } from "@/lib/auth";
import { datosDePaciente } from "@/lib/pacientes";

/** Derecho de acceso y portabilidad: descarga con todo lo que hay del paciente. Queda apuntado quién la hizo. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requerirSesion();
  const { id } = await params;
  const datos = await datosDePaciente(id);
  if (!datos) return new Response("No existe", { status: 404 });
  await anotar(user, "EXPORTAR", "paciente", id);
  return new Response(JSON.stringify(datos, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="paciente-${id}.json"`, "cache-control": "no-store" },
  });
}
