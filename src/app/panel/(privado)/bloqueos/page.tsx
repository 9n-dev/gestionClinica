import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatoFechaHora, hoy, sumarDias } from "@/lib/fechas";
import { gestionaTodo, puedeGestionar } from "@/lib/permisos";
import { borrarBloqueo } from "../../acciones";
import { FormularioBloqueo, FormularioFestivos } from "./formulario";

export const metadata: Metadata = { title: "Bloqueos" };

export default async function Bloqueos() {
  const { user } = await requerirSesion();
  const todo = gestionaTodo(user);
  const [profesionales, bloqueos] = await Promise.all([
    prisma.profesional.findMany({ where: { activo: true, ...(todo ? {} : { id: user.profesionalId! }) }, orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.bloqueo.findMany({ where: { fin: { gte: new Date() } }, orderBy: { inicio: "asc" }, include: { profesional: true } }),
  ]);
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section aria-labelledby="t-nuevo">
        <h1 id="t-nuevo" className="text-3xl font-bold">Bloquear horas</h1>
        <p className="mb-5 mt-2 max-w-[60ch] text-pizarra">Las horas bloqueadas dejan de ofrecerse en la reserva online: vacaciones, comidas, formación o festivos.</p>
        <FormularioBloqueo profesionales={profesionales} todaLaClinica={todo} porDefecto={sumarDias(hoy(), 1)} />
        {todo && <FormularioFestivos anio={Number(hoy().slice(0, 4))} />}
      </section>
      <section aria-labelledby="t-lista">
        <h2 id="t-lista" className="text-2xl font-bold">Bloqueos vigentes</h2>
        {bloqueos.length ? (
          <ul className="mt-4 divide-y divide-linea border-y border-linea">
            {bloqueos.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold">{b.motivo} <span className="font-normal text-pizarra">({b.profesional?.nombre ?? "toda la clínica"})</span></p>
                  <p className="tabular-nums">Del {formatoFechaHora(b.inicio)} al {formatoFechaHora(b.fin)}</p>
                </div>
                {puedeGestionar(user, b.profesionalId) && <form action={borrarBloqueo.bind(null, b.id)}>
                  <button className="btn btn-secundario min-h-10 px-3">Quitar<span className="sr-only"> el bloqueo {b.motivo}</span></button>
                </form>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-pizarra">No hay ningún bloqueo activo. Todo el horario de la clínica está abierto a reservas.</p>
        )}
      </section>
    </div>
  );
}
