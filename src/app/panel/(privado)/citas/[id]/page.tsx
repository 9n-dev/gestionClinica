import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioAuto } from "@/components/FormularioAuto";
import { anotar } from "@/lib/auditoria";
import { requerirSesion } from "@/lib/auth";
import { candidatosPara } from "@/lib/espera";
import { prisma } from "@/lib/db";
import { diaDe, esDia, formatoDia, formatoFechaHora, formatoFechaLarga, formatoHora, formatoPrecio, hoy } from "@/lib/fechas";
import { puedeGestionar } from "@/lib/permisos";
import { huecosEnRango } from "@/lib/reservas";
import { FORMAS_PAGO } from "@/lib/validacion";
import { anularCobro, cambiarEstado, cancelarDesdePanel } from "@/app/panel/acciones/citas";
import { ESTADOS } from "../../estados";
import { FormularioCobro, FormularioMover, FormularioNotas } from "./formularios";

export const metadata: Metadata = { title: "Detalle de cita" };

type Params = { creada?: string; movida?: string; dia?: string; profesional?: string; serie?: string; sinHueco?: string };

export default async function DetalleCita({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { user } = await requerirSesion();
  const { id } = await params;
  const sp = await searchParams;
  const cita = await prisma.cita.findUnique({ where: { id }, include: { servicio: true, profesional: true, emails: { orderBy: { enviadoAt: "asc" } }, mensajes: { orderBy: { enviadoAt: "asc" } } } });
  if (!cita) notFound();
  await anotar(user, "VER", "cita", id);
  const puede = puedeGestionar(user, cita.profesionalId);
  // Hueco que ha quedado libre y todavía no ha pasado: ¿le viene bien a alguien de la lista de espera?
  const enEspera = cita.estado === "CANCELADA" && cita.inicio > new Date() ? await candidatosPara(cita) : [];
  const faltas = await prisma.cita.count({ where: { pacienteId: cita.pacienteId, estado: "NO_PRESENTADA", id: { not: id } } });
  const estado = ESTADOS[cita.estado];
  const sinHueco = (sp.sinHueco ?? "").split(",").filter(esDia);
  const aviso = sp.movida ? "Cita movida." : !sp.creada ? null : sp.serie === undefined ? "Cita creada."
    : `Cita creada, y ${sp.serie === "1" ? "otra más" : `otras ${Number(sp.serie) || 0}`} de la serie (están en la ficha del paciente).`;

  // Cambiar hora: día y profesional por parámetro, horas libres calculadas sin contar esta misma cita
  let mover: { profesionales: { slug: string; nombre: string }[]; profesional: string; dia: string; horas: string[] } | null = null;
  if (cita.estado === "CONFIRMADA" && puede) {
    const profesionales = await prisma.profesional.findMany({ where: { activo: true, ...(user.rol === "ADMIN" || !user.profesionalId ? {} : { id: user.profesionalId }) }, orderBy: { orden: "asc" }, select: { slug: true, nombre: true } });
    const profesional = profesionales.find((p) => p.slug === sp.profesional)?.slug ?? cita.profesional.slug;
    const dia = esDia(sp.dia) ? sp.dia : diaDe(cita.inicio);
    const huecos = (await huecosEnRango({ desde: dia, dias: 1, servicioId: cita.servicioId, duracionMin: cita.servicio.duracionMin, profesionalSlug: profesional, desdePanel: true, excluirCitaId: id })).get(dia) ?? [];
    mover = { profesionales, profesional, dia, horas: huecos.map((h) => formatoHora(h.inicio)) };
  }

  return (
    <div className="max-w-3xl">
      <p><Link href={`/panel/agenda?fecha=${diaDe(cita.inicio)}`} className="enlace">Volver a la agenda de ese día</Link></p>
      {aviso && <p role="status" className="mt-4 rounded-md bg-pino-claro px-4 py-2 font-bold text-exito">{aviso}</p>}
      {sinHueco.length > 0 && <p role="alert" className="mt-2 rounded-md bg-ambar-claro px-4 py-2"><strong>Sin hueco a esa hora</strong> el {sinHueco.map((d) => formatoDia(d, { day: "numeric", month: "long" })).join(", ")}: esas no se han creado. Dales cita a mano.</p>}
      <h1 className="mt-4 text-3xl font-bold">{cita.pacienteNombre}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className={`inline-block rounded px-2.5 py-0.5 font-bold ${estado.clase}`}>{estado.texto}</span>
        <Link href={`/panel/pacientes/${cita.pacienteId}`} className="enlace">Ver la ficha del paciente</Link>
      </p>
      {faltas > 0 && <p className="mt-3 rounded-md bg-ambar-claro px-4 py-2"><strong>Ojo:</strong> este paciente no se presentó a {faltas === 1 ? "otra cita" : `otras ${faltas} citas`}.</p>}

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
        <dd>{cita.pacienteEmail ? <a href={`mailto:${cita.pacienteEmail}`} className="enlace break-all">{cita.pacienteEmail}</a> : <span className="text-pizarra">Sin email: no recibe confirmación ni recordatorio</span>}</dd>
        <dt className="text-pizarra">Reservada</dt>
        <dd>{formatoFechaHora(cita.creadaAt)}</dd>
        {cita.canceladaAt && (<><dt className="text-pizarra">Cancelada</dt><dd>{formatoFechaHora(cita.canceladaAt)}</dd></>)}
        {cita.recordatorioEnviadoAt && (<><dt className="text-pizarra">Recordatorio</dt><dd>Enviado el {formatoFechaHora(cita.recordatorioEnviadoAt)}</dd></>)}
      </dl>

      {!puede && <p className="mt-6 rounded-md bg-cielo px-4 py-3">Esta cita es de {cita.profesional.nombre}: puedes verla, pero no cambiarla.</p>}
      {cita.estado === "CONFIRMADA" && puede && (
        <div className="mt-6 flex flex-wrap items-start gap-4">
          <form action={cambiarEstado.bind(null, cita.id, "ATENDIDA")}>
            <button className="btn btn-primario">Marcar como atendida</button>
          </form>
          <form action={cambiarEstado.bind(null, cita.id, "NO_PRESENTADA")}>
            <button className="btn btn-secundario">No se presentó</button>
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

      {(cita.pagadaAt || (puede && (cita.estado === "CONFIRMADA" || cita.estado === "ATENDIDA"))) && (
        <section aria-labelledby="t-cobro" className="mt-8 rounded-lg border border-linea bg-white p-6">
          <h2 id="t-cobro" className="text-xl font-bold">Cobro</h2>
          {cita.pagadaAt ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p><span className="rounded bg-pino-claro px-2.5 py-0.5 font-bold text-exito">Cobrada</span> {formatoPrecio(cita.cobradoCent ?? 0)} · {FORMAS_PAGO[cita.formaPago!]} · {formatoFechaHora(cita.pagadaAt)}</p>
              {puede && <form action={anularCobro.bind(null, cita.id)}><button className="btn btn-secundario min-h-10 px-3">Anular el cobro</button></form>}
            </div>
          ) : (
            <div className="mt-3"><FormularioCobro id={cita.id} tarifa={cita.precioCent / 100} /></div>
          )}
        </section>
      )}

      {enEspera.length > 0 && (
        <section aria-labelledby="t-espera" className="mt-8 rounded-lg border border-cobalto bg-cielo p-6">
          <h2 id="t-espera" className="text-xl font-bold">En lista de espera para este hueco</h2>
          <p className="mt-1">Por orden de llegada. Llámale y, si le viene bien, dale la cita: el formulario se abre con todo puesto.</p>
          <ul className="mt-3 divide-y divide-linea rounded-lg bg-white">
            {enEspera.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold">{e.paciente.nombre} <a href={`tel:+34${e.paciente.telefono}`} className="enlace font-normal tabular-nums">{e.paciente.telefono}</a></p>
                  <p className="text-pizarra">{e.servicio.nombre} ({e.servicio.duracionMin} min){e.preferencia && ` · ${e.preferencia}`}</p>
                </div>
                <Link href={`/panel/citas/nueva?paciente=${e.pacienteId}&servicio=${e.servicio.slug}&profesional=${cita.profesional.slug}&dia=${diaDe(cita.inicio)}&hora=${formatoHora(cita.inicio)}`} className="btn btn-primario">Darle esta cita</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mover && (
        <section aria-labelledby="t-mover" className="mt-8 rounded-lg border border-linea bg-white p-6">
          <h2 id="t-mover" className="text-xl font-bold">Cambiar hora</h2>
          <p className="mt-1 text-pizarra">También puedes arrastrar la cita en la agenda. Si el paciente tiene email, se le avisa del cambio.</p>
          <FormularioAuto action={`/panel/citas/${cita.id}`} className="mt-4 flex flex-wrap gap-3">
            <div>
              <label htmlFor="dia" className="etiqueta">Día</label>
              <input id="dia" name="dia" type="date" defaultValue={mover.dia} min={hoy()} className="campo" />
            </div>
            <div>
              <label htmlFor="profesional" className="etiqueta">Profesional</label>
              <select id="profesional" name="profesional" defaultValue={mover.profesional} className="campo">
                {mover.profesionales.map((p) => <option key={p.slug} value={p.slug}>{p.nombre}</option>)}
              </select>
            </div>
            <noscript><button className="btn btn-secundario self-end">Ver horas libres</button></noscript>
          </FormularioAuto>
          <p className="mt-4 first-letter:uppercase">{formatoDia(mover.dia, { weekday: "long", day: "numeric", month: "long" })}: {mover.horas.length ? `${mover.horas.length} horas libres` : "sin horas libres"}</p>
          {mover.horas.length > 0 && (
            <div className="mt-2">
              <FormularioMover id={cita.id} profesional={mover.profesional} dia={mover.dia} horas={mover.horas} horaActual={formatoHora(cita.inicio)} />
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="t-notas" className="mt-8">
        <h2 id="t-notas" className="sr-only">Notas</h2>
        {puede ? <FormularioNotas id={cita.id} notas={cita.notas} /> : cita.notas && <p><strong>Notas internas:</strong> {cita.notas}</p>}
      </section>

      <section aria-labelledby="t-emails" className="mt-10">
        <h2 id="t-emails" className="text-xl font-bold">Emails y mensajes de esta cita</h2>
        {cita.emails.length + cita.mensajes.length ? (
          <ul className="mt-2 space-y-1">
            {cita.emails.map((e) => <li key={e.id}>{formatoFechaHora(e.enviadoAt)}: {e.asunto} <span className="text-pizarra">(para {e.para})</span></li>)}
            {cita.mensajes.map((m) => <li key={m.id}>{formatoFechaHora(m.enviadoAt)}: recordatorio al móvil <span className="text-pizarra">({m.canal === "CONSOLA" ? "consola" : m.canal === "SMS" ? "SMS" : "WhatsApp"}{m.error ? `, falló: ${m.error}` : ""})</span></li>)}
          </ul>
        ) : (
          <p className="mt-2 text-pizarra">Todavía no se ha enviado ninguno.</p>
        )}
      </section>
    </div>
  );
}
