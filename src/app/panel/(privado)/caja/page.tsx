import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAuto } from "@/components/FormularioAuto";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aInstante, esDia, formatoDia, formatoHora, formatoPrecio, hoy, sumarDias } from "@/lib/fechas";
import { gestionaTodo } from "@/lib/permisos";
import { FORMAS_PAGO } from "@/lib/validacion";

export const metadata: Metadata = { title: "Caja" };

export default async function Caja({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const { user } = await requerirSesion();
  const sp = await searchParams;
  const fecha = esDia(sp.fecha) && sp.fecha <= hoy() ? sp.fecha : hoy();
  const [desde, hasta] = [aInstante(fecha), aInstante(sumarDias(fecha, 1))];
  // Un profesional ve su caja; recepción y administración, la de todos.
  const suyas = gestionaTodo(user) ? {} : { profesionalId: user.profesionalId! };
  const incluir = { servicio: true, profesional: true } as const;
  const [cobros, sinCobrar] = await Promise.all([
    prisma.cita.findMany({ where: { ...suyas, pagadaAt: { gte: desde, lt: hasta } }, orderBy: { pagadaAt: "asc" }, include: incluir }), // por día de cobro, no de cita
    prisma.cita.findMany({ where: { ...suyas, estado: "ATENDIDA", pagadaAt: null, inicio: { gte: desde, lt: hasta } }, orderBy: { inicio: "asc" }, include: incluir }),
  ]);
  const total = cobros.reduce((s, c) => s + (c.cobradoCent ?? 0), 0);
  const porForma = Object.entries(FORMAS_PAGO).map(([k, nombre]) => ({ nombre, cent: cobros.filter((c) => c.formaPago === k).reduce((s, c) => s + (c.cobradoCent ?? 0), 0) })).filter((f) => f.cent);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold">Caja</h1>
      <p className="mt-2 text-pizarra">Lo cobrado cada día, por forma de pago, para cuadrar el cajón y el datáfono al cerrar. El cobro se apunta en el detalle de cada cita.</p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <FormularioAuto action="/panel/caja">
          <label htmlFor="fecha" className="etiqueta">Día</label>
          <input id="fecha" name="fecha" type="date" defaultValue={fecha} max={hoy()} className="campo" />
          <noscript><button className="btn btn-secundario ml-2">Ver</button></noscript>
        </FormularioAuto>
        <Link href={`/panel/caja?fecha=${sumarDias(fecha, -1)}`} className="btn btn-secundario">Día anterior</Link>
        {fecha < hoy() && <Link href="/panel/caja" className="btn btn-secundario">Hoy</Link>}
      </div>

      <h2 className="mt-8 text-2xl font-bold first-letter:uppercase">{formatoDia(fecha, { weekday: "long", day: "numeric", month: "long" })}</h2>
      <dl className="mt-4 flex flex-wrap gap-4">
        <div className="flex min-w-48 flex-col-reverse rounded-lg border border-linea bg-white p-5"><dt className="text-pizarra">Total cobrado</dt><dd className="text-4xl font-semibold">{formatoPrecio(total)}</dd></div>
        {porForma.map((f) => <div key={f.nombre} className="flex min-w-36 flex-col-reverse rounded-lg border border-linea bg-white p-5"><dt className="text-pizarra">{f.nombre}</dt><dd className="text-2xl font-semibold">{formatoPrecio(f.cent)}</dd></div>)}
      </dl>

      <section aria-labelledby="t-cobros" className="mt-8">
        <h3 id="t-cobros" className="text-xl font-bold">Cobros del día</h3>
        {cobros.length ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-linea bg-white">
            <table className="w-full text-left">
              <thead className="border-b border-linea text-pizarra"><tr><th scope="col" className="p-3 font-normal">Hora</th><th scope="col" className="p-3 font-normal">Paciente</th><th scope="col" className="p-3 font-normal">Servicio</th><th scope="col" className="p-3 font-normal">Forma de pago</th><th scope="col" className="p-3 text-right font-normal">Importe</th></tr></thead>
              <tbody>
                {cobros.map((c) => (
                  <tr key={c.id} className="border-b border-linea last:border-0">
                    <td className="p-3 tabular-nums">{formatoHora(c.pagadaAt!)}</td>
                    <th scope="row" className="p-3"><Link href={`/panel/citas/${c.id}`} className="enlace">{c.pacienteNombre}</Link></th>
                    <td className="p-3">{c.servicio.nombre} <span className="text-pizarra">· {c.profesional.nombre}</span></td>
                    <td className="p-3">{FORMAS_PAGO[c.formaPago!]}</td>
                    <td className="p-3 text-right tabular-nums">{formatoPrecio(c.cobradoCent ?? 0)}{c.cobradoCent !== c.precioCent && <span className="block text-sm text-pizarra">tarifa {formatoPrecio(c.precioCent)}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-pizarra">No se ha cobrado nada este día.</p>
        )}
      </section>

      {sinCobrar.length > 0 && (
        <section aria-labelledby="t-sin-cobrar" className="mt-8 rounded-lg bg-ambar-claro p-5">
          <h3 id="t-sin-cobrar" className="text-xl font-bold">Atendidas este día y sin cobrar</h3>
          <ul className="mt-2 space-y-1">
            {sinCobrar.map((c) => <li key={c.id}><Link href={`/panel/citas/${c.id}`} className="enlace font-bold">{c.pacienteNombre}</Link> · {formatoHora(c.inicio)} · {c.servicio.nombre} · {formatoPrecio(c.precioCent)}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
