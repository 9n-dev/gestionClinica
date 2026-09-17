import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CLINICA, DIRECCION_COMPLETA } from "@/lib/clinica";
import { prisma } from "@/lib/db";
import { formatoFechaLarga, formatoHora, formatoPrecio } from "@/lib/fechas";
import { cancelarCita } from "@/lib/reservas";

export const metadata: Metadata = { title: "Tu cita", robots: { index: false } };

export default async function PaginaCita({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ nueva?: string }> }) {
  const { token } = await params;
  const cita = await prisma.cita.findUnique({ where: { tokenCancelacion: token }, include: { servicio: true, profesional: true } });
  if (!cita) notFound();
  const nueva = (await searchParams).nueva === "1" && cita.estado === "CONFIRMADA";
  const cancelable = cita.estado === "CONFIRMADA" && cita.inicio > new Date();

  async function cancelar() {
    "use server";
    await cancelarCita({ tokenCancelacion: token });
    revalidatePath(`/cita/${token}`);
  }

  const titulo = cita.estado === "CANCELADA" ? "Cita cancelada" : nueva ? "Cita confirmada" : cita.estado === "ATENDIDA" ? "Cita atendida" : "Tu cita";

  return (
    <div className="contenedor max-w-3xl py-12">
      <h1 className="text-4xl font-extrabold sm:text-5xl">{titulo}</h1>
      {nueva && <p className="mt-4 text-xl">Te hemos enviado la confirmación a <strong>{cita.pacienteEmail}</strong>. Te esperamos.</p>}
      {cita.estado === "CANCELADA" && <p className="mt-4 text-xl">Esta cita ya no está reservada. El hueco ha quedado libre para otra persona.</p>}

      <dl className={`mt-8 grid gap-x-8 gap-y-4 rounded-lg border border-linea bg-white p-6 sm:grid-cols-[10rem_1fr] ${cita.estado === "CANCELADA" ? "text-pizarra line-through" : ""}`}>
        <dt className="text-pizarra">Servicio</dt>
        <dd className="font-bold">{cita.servicio.nombre} ({cita.servicio.duracionMin} min, {formatoPrecio(cita.servicio.precioCent)})</dd>
        <dt className="text-pizarra">Día</dt>
        <dd className="font-bold">{formatoFechaLarga(cita.inicio)}</dd>
        <dt className="text-pizarra">Hora</dt>
        <dd className="font-bold">{formatoHora(cita.inicio)}</dd>
        <dt className="text-pizarra">Profesional</dt>
        <dd className="font-bold">{cita.profesional.nombre}</dd>
        <dt className="text-pizarra">Dirección</dt>
        <dd className="font-bold">{DIRECCION_COMPLETA}</dd>
      </dl>

      {cancelable && (
        <details className="mt-8 rounded-lg border border-linea bg-white p-5">
          <summary className="cursor-pointer font-bold">No puedo ir: quiero cancelar esta cita</summary>
          <form action={cancelar} className="mt-4">
            <p className="mb-4">Al cancelar, el hueco queda libre al momento y no se puede deshacer. Si quieres otra hora, tendrás que pedir una cita nueva.</p>
            <button className="btn btn-peligro">Cancelar mi cita</button>
          </form>
        </details>
      )}
      {cita.estado === "CONFIRMADA" && !cancelable && (
        <p className="mt-8">La hora de esta cita ya ha pasado. Si necesitas algo, llámanos al <a href={CLINICA.telefonoHref} className="enlace">{CLINICA.telefono}</a>.</p>
      )}

      <p className="mt-10 flex flex-wrap gap-3">
        {cita.estado !== "CONFIRMADA" && <Link href="/reservar" className="btn btn-primario">Pedir otra cita</Link>}
        <Link href="/" className="btn btn-secundario">Volver al inicio</Link>
      </p>
    </div>
  );
}
