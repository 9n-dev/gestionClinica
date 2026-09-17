import type { Metadata } from "next";
import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatoFechaHora } from "@/lib/fechas";

export const metadata: Metadata = { title: "Emails enviados" };

const TIPOS = { CONFIRMACION_PACIENTE: "Confirmación al paciente", AVISO_CLINICA: "Aviso a la clínica", RECORDATORIO: "Recordatorio", CANCELACION: "Cancelación" };

export default async function Emails() {
  await requerirSesion();
  const emails = await prisma.emailEnviado.findMany({ orderBy: { enviadoAt: "desc" }, take: 100 });
  return (
    <>
      <h1 className="text-3xl font-bold">Emails enviados</h1>
      <p className="mt-2 max-w-[70ch] text-pizarra">
        Todo lo que sale del sistema queda registrado aquí. Sin clave de Resend configurada, los emails no se envían de verdad: se escriben en la consola del servidor (canal «consola»).
      </p>
      {emails.length ? (
        <ul className="mt-6 space-y-2">
          {emails.map((e) => (
            <li key={e.id}>
              <details className="rounded-lg border border-linea bg-white">
                <summary className="grid cursor-pointer gap-x-4 gap-y-1 p-4 md:grid-cols-[9.5rem_13rem_1fr_auto]">
                  <span className="tabular-nums text-pizarra">{formatoFechaHora(e.enviadoAt)}</span>
                  <span className="font-bold">{TIPOS[e.tipo]}</span>
                  <span>{e.asunto}<span className="block break-all text-pizarra">Para {e.para}</span></span>
                  <span className={e.error ? "font-bold text-error" : "text-pizarra"}>{e.error ? "Falló" : e.canal === "RESEND" ? "Resend" : "Consola"}</span>
                </summary>
                <div className="border-t border-linea p-4">
                  {e.error && <p className="mb-3 font-bold text-error">Error: {e.error}</p>}
                  {e.citaId && <p className="mb-3"><Link href={`/panel/citas/${e.citaId}`} className="enlace">Ver la cita</Link></p>}
                  <iframe title={`Contenido del email: ${e.asunto}`} srcDoc={e.html} sandbox="" loading="lazy" className="h-[32rem] w-full rounded border border-linea" />
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-lg bg-ambar-claro p-5">Aún no hay emails. Haz una reserva de prueba en la web y aparecerán aquí la confirmación al paciente y el aviso a la clínica.</p>
      )}
    </>
  );
}
