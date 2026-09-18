import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { diaDe, formatoDia, formatoFechaHora } from "@/lib/fechas";
import { ESTADOS } from "../../estados";
import { FormularioPaciente } from "./formulario";

export const metadata: Metadata = { title: "Ficha de paciente" };

export default async function FichaPaciente({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const { id } = await params;
  const paciente = await prisma.paciente.findUnique({
    where: { id },
    include: { citas: { orderBy: { inicio: "desc" }, include: { servicio: true, profesional: true } } },
  });
  if (!paciente) notFound();

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
          <Link href={`/panel/citas/nueva?paciente=${paciente.id}`} className="btn btn-primario">Nueva cita para este paciente</Link>
        </div>
        {proximas.length ? lista(proximas) : <p className="mt-3 text-pizarra">No tiene ninguna cita pendiente.</p>}
      </section>

      <section aria-labelledby="t-historial" className="mt-8">
        <h2 id="t-historial" className="text-xl font-bold">Historial</h2>
        {historial.length ? lista(historial) : <p className="mt-3 text-pizarra">Todavía no ha venido a la clínica.</p>}
      </section>

      <section aria-labelledby="t-datos" className="mt-8">
        <h2 id="t-datos" className="text-xl font-bold">Datos de contacto y notas</h2>
        <div className="mt-3">
          <FormularioPaciente p={{ id: paciente.id, nombre: paciente.nombre, telefono: paciente.telefono, email: paciente.email ?? "", notas: paciente.notas ?? "" }} />
        </div>
      </section>
    </div>
  );
}
