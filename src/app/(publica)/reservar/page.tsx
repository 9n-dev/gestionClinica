import type { Metadata } from "next";
import Link from "next/link";
import { CLINICA } from "@/lib/clinica";
import { prisma } from "@/lib/db";
import { aInstante, esDia, formatoDia, formatoHora, formatoPrecio, hoy, sumarDias } from "@/lib/fechas";
import { CUALQUIERA, huecosEnRango, ultimoDiaReservable } from "@/lib/reservas";
import { FormularioPaciente } from "./formulario";

export const metadata: Metadata = { title: "Pedir cita", description: "Reserva tu cita de podología online: elige servicio, profesional, día y hora." };

type Params = { servicio?: string; profesional?: string; dia?: string; hora?: string; semana?: string };
const PASOS = ["Servicio", "Profesional", "Día y hora", "Tus datos"];

const url = (p: Params) => {
  const q = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]);
  return `/reservar${q.size ? `?${q}` : ""}`;
};

export default async function Reservar({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const [servicios, profesionales] = await Promise.all([
    prisma.servicio.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.profesional.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
  ]);
  const servicio = servicios.find((s) => s.slug === sp.servicio);
  const profesional = profesionales.find((p) => p.slug === sp.profesional);
  const slugPro = profesional?.slug ?? (sp.profesional === CUALQUIERA ? CUALQUIERA : undefined);
  const dia = esDia(sp.dia) ? sp.dia : undefined;
  const hora = dia && /^\d{2}:\d{2}$/.test(sp.hora ?? "") ? sp.hora : undefined;

  const paso = !servicio ? 1 : !slugPro ? 2 : !hora ? 3 : 4;
  const elegido = [
    servicio && `${servicio.nombre}, ${formatoPrecio(servicio.precioCent)}`,
    slugPro && (profesional?.nombre ?? "Cualquier profesional"),
    dia && hora && `${formatoDia(dia, { weekday: "long", day: "numeric", month: "long" })}, ${hora}`,
  ];
  const volverA = [url({ profesional: sp.profesional }), url({ servicio: sp.servicio }), url({ servicio: sp.servicio, profesional: slugPro, dia })];

  return (
    <div className="contenedor py-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Pedir cita</h1>

      <ol className="mt-8 grid gap-x-6 gap-y-2 border-y border-linea py-4 sm:grid-cols-4">
        {PASOS.map((nombre, i) => {
          const n = i + 1;
          return (
            <li key={nombre} aria-current={n === paso ? "step" : undefined} className={n > paso ? "text-pizarra" : ""}>
              <span className={`font-display font-bold ${n === paso ? "text-cobalto" : ""}`}>{n}. {nombre}</span>
              {n < paso && (
                <span className="block text-base">
                  {elegido[i]}{" "}
                  <Link href={volverA[i]} className="enlace whitespace-nowrap">Cambiar<span className="sr-only"> {nombre.toLowerCase()}</span></Link>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <section aria-labelledby="t-paso" className="mt-10">
        {paso === 1 && (
          <>
            <h2 id="t-paso" className="text-3xl font-bold">¿Qué necesitas?</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {servicios.map((s) => (
                <li key={s.id}>
                  <Link href={url({ ...sp, servicio: s.slug })} className="block h-full rounded-lg border border-pizarra bg-white p-5 no-underline hover:border-cobalto hover:bg-cielo">
                    <span className="block font-display text-xl font-bold text-tinta">{s.nombre}</span>
                    <span className="mt-1 block text-pizarra">{s.duracionMin} minutos, {formatoPrecio(s.precioCent)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-pizarra">Si no sabes cuál elegir, pide una consulta general.</p>
          </>
        )}

        {paso === 2 && (
          <>
            <h2 id="t-paso" className="text-3xl font-bold">¿Con quién?</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {[{ slug: CUALQUIERA, nombre: "Me da igual", titulo: "Te enseñamos todos los huecos libres" }, ...profesionales].map((p) => (
                <li key={p.slug}>
                  <Link href={url({ ...sp, profesional: p.slug })} className="block h-full rounded-lg border border-pizarra bg-white p-5 no-underline hover:border-cobalto hover:bg-cielo">
                    <span className="block font-display text-xl font-bold text-tinta">{p.nombre}</span>
                    <span className="mt-1 block text-pizarra">{p.titulo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {paso === 3 && servicio && slugPro && <PasoCalendario sp={sp} duracionMin={servicio.duracionMin} slugPro={slugPro} dia={dia} />}

        {paso === 4 && servicio && slugPro && dia && hora && (
          <>
            <h2 id="t-paso" className="text-3xl font-bold">Tus datos de contacto</h2>
            <p className="mb-6 mt-2 text-pizarra">Solo lo imprescindible para gestionar la cita. Todos los campos son obligatorios.</p>
            <FormularioPaciente servicio={servicio.slug} profesional={slugPro} dia={dia} hora={hora} urlHoras={volverA[2]} responsable={CLINICA.razonSocial} />
          </>
        )}
      </section>
    </div>
  );
}

async function PasoCalendario({ sp, duracionMin, slugPro, dia }: { sp: Params; duracionMin: number; slugPro: string; dia?: string }) {
  const primero = hoy();
  const ultimo = ultimoDiaReservable();
  let semana = esDia(sp.semana) ? sp.semana : dia ?? primero;
  if (semana < primero || semana > ultimo) semana = primero;

  const huecos = await huecosEnRango({ desde: semana, dias: 7, duracionMin, profesionalSlug: slugPro });
  const dias = [...huecos.keys()];
  const seleccionado = dia && huecos.get(dia)?.length ? dia : dias.find((d) => huecos.get(d)!.length);
  const horas = seleccionado ? huecos.get(seleccionado)! : [];
  const corte = seleccionado ? aInstante(seleccionado, 15 * 60) : new Date();
  const grupos = [
    { titulo: "Mañana", horas: horas.filter((h) => h.inicio < corte) },
    { titulo: "Tarde", horas: horas.filter((h) => h.inicio >= corte) },
  ].filter((g) => g.horas.length);

  const base = { servicio: sp.servicio, profesional: slugPro };
  const anterior = sumarDias(semana, -7) < primero ? primero : sumarDias(semana, -7);
  const siguiente = sumarDias(semana, 7);
  const nav = "btn btn-secundario";

  return (
    <>
      <h2 id="t-paso" className="text-3xl font-bold">¿Cuándo te viene bien?</h2>

      <nav aria-label="Semanas" className="mt-6 flex items-center justify-between gap-3">
        {semana > primero ? <Link href={url({ ...base, semana: anterior })} className={nav}>Semana anterior</Link> : <span />}
        {siguiente <= ultimo && <Link href={url({ ...base, semana: siguiente })} className={nav}>Semana siguiente</Link>}
      </nav>

      <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {dias.map((d) => {
          const n = huecos.get(d)!.length;
          const contenido = (
            <>
              <span className="block text-base">{formatoDia(d, { weekday: "short" })}</span>
              <span className="block font-display text-2xl font-bold">{formatoDia(d, { day: "numeric" })}</span>
              <span className="block text-sm">{formatoDia(d, { month: "short" })}</span>
              <span className="mt-1 block text-sm">{n ? `${n} ${n === 1 ? "hueco" : "huecos"}` : "Sin huecos"}</span>
            </>
          );
          const caja = "block rounded-lg border p-2 text-center no-underline";
          return (
            <li key={d}>
              {n ? (
                <Link
                  href={url({ ...base, semana, dia: d })}
                  aria-current={d === seleccionado ? "date" : undefined}
                  className={`${caja} ${d === seleccionado ? "border-cobalto bg-cobalto text-white" : "border-pizarra bg-white text-tinta hover:bg-cielo"}`}
                >
                  {contenido}
                </Link>
              ) : (
                <span className={`${caja} border-linea text-pizarra`}>{contenido}</span>
              )}
            </li>
          );
        })}
      </ul>

      {seleccionado ? (
        <div className="mt-8">
          <h3 className="text-2xl font-bold">Horas libres el {formatoDia(seleccionado, { weekday: "long", day: "numeric", month: "long" })}</h3>
          {grupos.map((g) => (
            <div key={g.titulo} className="mt-5">
              <h4 className="font-bold text-pizarra">{g.titulo}</h4>
              <ul className="mt-2 flex flex-wrap gap-2">
                {g.horas.map((h) => (
                  <li key={h.inicio.getTime()}>
                    <Link href={url({ ...base, dia: seleccionado, hora: formatoHora(h.inicio) })} className="btn btn-secundario min-w-20 tabular-nums">
                      {formatoHora(h.inicio)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-lg bg-ambar-claro p-5">
          No quedan huecos esta semana. Prueba con la semana siguiente{slugPro !== CUALQUIERA && " o con otro profesional"}, o llámanos al{" "}
          <a href={CLINICA.telefonoHref} className="enlace">{CLINICA.telefono}</a>.
        </p>
      )}
    </>
  );
}
