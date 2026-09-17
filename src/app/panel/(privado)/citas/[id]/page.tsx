import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { diaDe, formatoFechaHora, formatoFechaLarga, formatoHora, formatoPrecio } from "@/lib/fechas";
import { cancelarDesdePanel, marcarAtendida } from "../../../acciones";

export const metadata: Metadata = { title: "Detalle de cita" };

const ESTADOS = {
  CONFIRMADA: { texto: "Confirmada", clase: "bg-cielo text-cobalto-oscuro" },
  ATENDIDA: { texto: "Atendida", clase: "bg-pino-claro text-exito" },
  CANCELADA: { texto: "Cancelada", clase: "bg-white text-error border border-error" },
};

export default async function DetalleCita({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const { id } = await params;
  const cita = await prisma.cita.findUnique({ where: { id }, include: { servicio: true, profesional: true, emails: { orderBy: { enviadoAt: "asc" } } } });
  if (!cita) notFound();
  const estado = ESTADOS[cita.estado];

  return (
    <div className="max-w-3xl">
      <p><Link href={`/panel/agenda?fecha=${diaDe(cita.inicio)}`} className="enlace">Volver a la agenda de ese día</Link></p>
      <h1 className="mt-4 text-3xl font-bold">{cita.pacienteNombre}</h1>
      <p className="mt-2"><span className={`inline-block rounded px-2.5 py-0.5 font-bold ${estado.clase}`}>{estado.texto}</span></p>

      <dl className="mt-6 grid gap-x-8 gap-y-3 rounded-lg border border-linea bg-white p-6 sm:grid-cols-[10rem_1fr]">
        <dt className="text-pizarra">Servicio</dt>
        <dd className="font-bold">{cita.servicio.nombre} ({cita.servicio.duracionMin} min, {formatoPrecio(cita.servicio.precioCent)})</dd>
        <dt className="text-pizarra">Cuándo</dt>
        <dd className="font-bold first-letter:uppercase">{formatoFechaLarga(cita.inicio)}, de {formatoHora(cita.inicio)} a {formatoHora(cita.fin)}</dd>
        <dt className="text-pizarra">Profesional</dt>
        <dd className="font-bold">{cita.profesional.nombre}</dd>
        <dt className="text-pizarra">Teléfono</dt>
        <dd><a href={`tel:+34${cita.pacienteTelefono}`} className="enlace">{cita.pacienteTelefono}</a></dd>
        <dt className="text-pizarra">Email</dt>
        <dd><a href={`mailto:${cita.pacienteEmail}`} className="enlace break-all">{cita.pacienteEmail}</a></dd>
        <dt className="text-pizarra">Reservada</dt>
        <dd>{formatoFechaHora(cita.creadaAt)}</dd>
        {cita.canceladaAt && (<><dt className="text-pizarra">Cancelada</dt><dd>{formatoFechaHora(cita.canceladaAt)}</dd></>)}
        {cita.recordatorioEnviadoAt && (<><dt className="text-pizarra">Recordatorio</dt><dd>Enviado el {formatoFechaHora(cita.recordatorioEnviadoAt)}</dd></>)}
      </dl>

      {cita.estado === "CONFIRMADA" && (
        <div className="mt-6 flex flex-wrap items-start gap-4">
          <form action={marcarAtendida.bind(null, cita.id)}>
            <button className="btn btn-primario">Marcar como atendida</button>
          </form>
          <details className="rounded-md border border-linea bg-white px-4 py-2.5">
            <summary className="cursor-pointer font-bold text-error">Cancelar la cita</summary>
            <form action={cancelarDesdePanel.bind(null, cita.id)} className="mt-3 max-w-md">
              <p className="mb-3">Se libera el hueco en la web y se avisa al paciente por email. No se puede deshacer.</p>
              <button className="btn btn-peligro">Sí, cancelar la cita</button>
            </form>
          </details>
        </div>
      )}

      <section aria-labelledby="t-emails" className="mt-10">
        <h2 id="t-emails" className="text-xl font-bold">Emails de esta cita</h2>
        {cita.emails.length ? (
          <ul className="mt-2 space-y-1">
            {cita.emails.map((e) => <li key={e.id}>{formatoFechaHora(e.enviadoAt)}: {e.asunto} <span className="text-pizarra">(para {e.para})</span></li>)}
          </ul>
        ) : (
          <p className="mt-2 text-pizarra">Todavía no se ha enviado ninguno.</p>
        )}
      </section>
    </div>
  );
}
