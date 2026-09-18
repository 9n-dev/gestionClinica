import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { anotar } from "@/lib/auditoria";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { diaDe, formatoDia, formatoFechaHora } from "@/lib/fechas";
import { ESTADOS } from "../../estados";
import { quitarDeEspera } from "../../../acciones";
import { FormularioEspera, FormularioPaciente, FormularioSupresion } from "./formulario";

export const metadata: Metadata = { title: "Ficha de paciente" };

export default async function FichaPaciente({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requerirSesion();
  const { id } = await params;
  const paciente = await prisma.paciente.findUnique({
    where: { id },
    include: { citas: { orderBy: { inicio: "desc" }, include: { servicio: true, profesional: true } }, enEspera: { where: { atendidoAt: null }, include: { servicio: true, profesional: true } } },
  });
  const [servicios, profesionales] = await Promise.all([
    prisma.servicio.findMany({ where: { activo: true }, orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.profesional.findMany({ where: { activo: true }, orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
  ]);
  if (!paciente) notFound();
  await anotar(user, "VER", "paciente", id);
  const eliminado = !!paciente.eliminadoAt;

  const ahora = new Date();
  const proximas = paciente.citas.filter((c) => c.estado === "CONFIRMADA" && c.inicio > ahora).reverse();
  const historial = paciente.citas.filter((c) => !proximas.includes(c));
  const cuenta = (estado: keyof typeof ESTADOS) => paciente.citas.filter((c) => c.estado === estado).length;
  const faltas = cuenta("NO_PRESENTADA");

  const lista = (citas: typeof paciente.citas) => (
    <ul className="mt-3 divide-y divide-linea rounded-lg border border-linea bg-white">
      {citas.map((c) => (
        <li key={c.id} className="grid gap-x-4 gap-y-1 p-4 sm:grid-cols-[13rem_1fr_auto] sm:items-center">
          <Link href={`/panel/citas/${c.id}`} className="enlace font-bold tabular-nums">{formatoFechaHora(c.inicio)}</Link>
          <span>{c.servicio.nombre} <span className="text-pizarra">con {c.profesional.nombre}</span></span>
          <span className={`justify-self-start rounded px-2.5 py-0.5 font-bold ${ESTADOS[c.estado].clase}`}>{ESTADOS[c.estado].texto}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="max-w-3xl">
      <p><Link href="/panel/pacientes" className="enlace">Volver a pacientes</Link></p>
      <h1 className="mt-4 text-3xl font-bold">{paciente.nombre}</h1>
      <p className="mt-1 text-pizarra">Paciente desde el {formatoDia(diaDe(paciente.creadoAt), { day: "numeric", month: "long", year: "numeric" })}</p>
      {paciente.eliminadoAt && (
        <p className="mt-4 rounded-md bg-ambar-claro px-4 py-3">
          Sus datos se eliminaron el {formatoDia(diaDe(paciente.eliminadoAt), { day: "numeric", month: "long", year: "numeric" })} a petición suya (derecho de supresión). Las citas se conservan sin nombre para que la agenda pasada cuadre.
        </p>
      )}

      <dl className="mt-6 grid grid-cols-3 gap-4 text-center">
        {[["Visitas", cuenta("ATENDIDA"), ""], ["No se presentó", faltas, faltas ? "bg-ambar-claro" : ""], ["Canceladas", cuenta("CANCELADA"), ""]].map(([texto, n, clase]) => (
          <div key={texto} className={`flex flex-col-reverse rounded-lg border border-linea p-4 ${clase || "bg-white"}`}>
            <dt className="text-pizarra">{texto}</dt>
            <dd className="font-display text-3xl font-bold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="t-proximas" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="t-proximas" className="text-xl font-bold">Próximas citas</h2>
          {!eliminado && <Link href={`/panel/citas/nueva?paciente=${paciente.id}`} className="btn btn-primario">Nueva cita para este paciente</Link>}
        </div>
        {proximas.length ? lista(proximas) : <p className="mt-3 text-pizarra">No tiene ninguna cita pendiente.</p>}
      </section>

      {!paciente.eliminadoAt && (
        <section aria-labelledby="t-espera" className="mt-8">
          <h2 id="t-espera" className="text-xl font-bold">Lista de espera</h2>
          {paciente.enEspera.map((e) => (
            <div key={e.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-linea bg-white p-4">
              <p><strong>{e.servicio.nombre}</strong> con {e.profesional?.nombre ?? "cualquiera"}{e.preferencia && <span className="text-pizarra"> · {e.preferencia}</span>}</p>
              <form action={quitarDeEspera.bind(null, e.id)}><button className="btn btn-secundario min-h-10 px-3">Quitar de la lista</button></form>
            </div>
          ))}
          <details className="mt-3 rounded-lg border border-dashed border-pizarra p-4">
            <summary className="cursor-pointer font-bold">Apuntar en la lista de espera</summary>
            <div className="mt-4"><FormularioEspera pacienteId={paciente.id} servicios={servicios} profesionales={profesionales} /></div>
          </details>
        </section>
      )}

      <section aria-labelledby="t-historial" className="mt-8">
        <h2 id="t-historial" className="text-xl font-bold">Historial</h2>
        {historial.length ? lista(historial) : <p className="mt-3 text-pizarra">Todavía no ha venido a la clínica.</p>}
      </section>

      {!eliminado && (
        <>
          <section aria-labelledby="t-datos" className="mt-8">
            <h2 id="t-datos" className="text-xl font-bold">Datos de contacto y notas</h2>
            <div className="mt-3">
              <FormularioPaciente p={{ id: paciente.id, nombre: paciente.nombre, telefono: paciente.telefono, email: paciente.email ?? "", notas: paciente.notas ?? "" }} />
            </div>
          </section>

          <section aria-labelledby="t-rgpd" className="mt-8">
            <h2 id="t-rgpd" className="text-xl font-bold">Protección de datos</h2>
            <p className="mt-1 max-w-[70ch] text-pizarra">Si el paciente pide una copia de sus datos o que se eliminen. Las dos cosas quedan apuntadas en el registro de actividad.</p>
            <div className="mt-3 flex flex-wrap items-start gap-4">
              {/* <a> y no <Link>: es una descarga, no una página */}
              <a href={`/panel/pacientes/${paciente.id}/exportar`} className="btn btn-secundario" download>Descargar sus datos (JSON)</a>
              {user.rol === "ADMIN" && <FormularioSupresion id={paciente.id} nombre={paciente.nombre} />}
            </div>
          </section>
        </>
      )}
      {user.rol === "ADMIN" && <p className="mt-8"><Link href={`/panel/actividad?entidad=paciente&id=${paciente.id}`} className="enlace">Quién ha abierto o cambiado esta ficha</Link></p>}
    </div>
  );
}
