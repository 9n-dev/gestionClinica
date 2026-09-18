import type { Metadata } from "next";
import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatoFechaHora } from "@/lib/fechas";
import { quitarDeEspera } from "@/app/panel/acciones/pacientes";

export const metadata: Metadata = { title: "Lista de espera" };

export default async function ListaDeEspera() {
  await requerirSesion();
  const lista = await prisma.enEspera.findMany({ where: { atendidoAt: null, paciente: { eliminadoAt: null } }, orderBy: { creadoAt: "asc" }, include: { paciente: true, servicio: true, profesional: true } });
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold">Lista de espera</h1>
      <p className="mt-2 max-w-[70ch] text-pizarra">
        Quien quiere venir antes de lo que hay libre. Se apunta desde la ficha del paciente. Cuando se cancela una cita, en su detalle (y en el email de aviso) sale a quién de esta lista le encaja ese hueco; al darle cita, sale de la lista solo.
      </p>
      {lista.length ? (
        <ul className="mt-6 divide-y divide-linea rounded-lg border border-linea bg-white">
          {lista.map((e, i) => (
            <li key={e.id} className="grid gap-x-4 gap-y-2 p-4 md:grid-cols-[2rem_1fr_auto] md:items-center">
              <span className="font-display text-xl font-bold text-pizarra">{i + 1}</span>
              <div>
                <p><Link href={`/panel/pacientes/${e.pacienteId}`} className="enlace font-bold">{e.paciente.nombre}</Link> <a href={`tel:+34${e.paciente.telefono}`} className="enlace tabular-nums">{e.paciente.telefono}</a></p>
                <p>{e.servicio.nombre} con {e.profesional?.nombre ?? "cualquiera"}{e.preferencia && <span className="text-pizarra"> · {e.preferencia}</span>}</p>
                <p className="text-base text-pizarra">Apuntado el {formatoFechaHora(e.creadoAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/panel/citas/nueva?paciente=${e.pacienteId}&servicio=${e.servicio.slug}${e.profesional ? `&profesional=${e.profesional.slug}` : ""}`} className="btn btn-primario min-h-10 px-3">Dar cita</Link>
                <form action={quitarDeEspera.bind(null, e.id)}><button className="btn btn-secundario min-h-10 px-3">Quitar<span className="sr-only"> a {e.paciente.nombre} de la lista</span></button></form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-lg bg-ambar-claro p-5">No hay nadie esperando. Para apuntar a alguien, abre su ficha en «Pacientes».</p>
      )}
    </div>
  );
}
