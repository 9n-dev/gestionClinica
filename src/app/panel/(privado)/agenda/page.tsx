import type { Metadata } from "next";
import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aInstante, diaDe, diaSemana, esDia, formatoDia, formatoHora, hoy, lunesDe, minutosDe, sumarDias, type Dia } from "@/lib/fechas";
import { DESDE, HASTA, Rejilla, type BloqueoRejilla, type CitaRejilla, type Tramo } from "./Rejilla";

export const metadata: Metadata = { title: "Agenda" };

const TONOS = ["border-cobalto bg-cielo", "border-exito bg-pino-claro"];
const iniciales = (nombre: string) => nombre.replace(/^Dra?\.\s*/, "").split(" ").map((x) => x[0]).join("");

type Params = { vista?: string; fecha?: string; profesional?: string };

export default async function Agenda({ searchParams }: { searchParams: Promise<Params> }) {
  const sesion = await requerirSesion();
  const sp = await searchParams;
  const vista = sp.vista === "semana" ? "semana" : "dia";
  const fecha: Dia = esDia(sp.fecha) ? sp.fecha : hoy();

  const todos = await prisma.profesional.findMany({ where: { activo: true }, orderBy: { orden: "asc" }, include: { horarios: true } });
  // Sin parámetro, un usuario ligado a un profesional ve su columna; "todos" quita el filtro.
  const slugFiltro = sp.profesional ?? sesion.user.profesionalSlug ?? "todos";
  const pros = todos.filter((p) => slugFiltro === "todos" || p.slug === slugFiltro);
  const filtro = pros.length === 1 ? pros[0].slug : undefined;

  const dias = vista === "dia" ? [fecha] : Array.from({ length: 6 }, (_, i) => sumarDias(lunesDe(fecha), i));
  const inicio = aInstante(dias[0]);
  const fin = aInstante(sumarDias(dias.at(-1)!, 1));
  const enRango = { inicio: { lt: fin }, fin: { gt: inicio } };
  const [citas, bloqueos] = await Promise.all([
    prisma.cita.findMany({ where: { ...enRango, profesionalId: { in: pros.map((p) => p.id) } }, include: { servicio: true, profesional: true }, orderBy: { inicio: "asc" } }),
    prisma.bloqueo.findMany({ where: enRango }),
  ]);
  const activas = citas.filter((c) => c.estado !== "CANCELADA");
  const canceladas = citas.filter((c) => c.estado === "CANCELADA");

  const columnas = dias.flatMap((dia) =>
    pros.map((pro) => ({
      dia,
      diaTexto: formatoDia(dia, vista === "semana" ? { weekday: "short", day: "numeric" } : { weekday: "long", day: "numeric" }),
      esHoy: dia === hoy(),
      pro: { id: pro.id, slug: pro.slug, nombre: pro.nombre, iniciales: iniciales(pro.nombre) },
    })),
  );
  const colDe = (dia: string, proId: string) => columnas.findIndex((c) => c.dia === dia && c.pro.id === proId);

  const tramos: Tramo[] = columnas.flatMap((c, col) =>
    todos.find((p) => p.id === c.pro.id)!.horarios.filter((t) => t.diaSemana === diaSemana(c.dia)).map((t) => ({ col, desde: t.minInicio, hasta: t.minFin })),
  );
  const bloqueosRejilla: BloqueoRejilla[] = columnas.flatMap((c, col) =>
    bloqueos
      .filter((b) => (!b.profesionalId || b.profesionalId === c.pro.id) && b.inicio < aInstante(sumarDias(c.dia, 1)) && b.fin > aInstante(c.dia))
      .map((b) => ({
        id: b.id,
        col,
        desde: b.inicio <= aInstante(c.dia) ? DESDE : minutosDe(b.inicio),
        hasta: b.fin >= aInstante(sumarDias(c.dia, 1)) ? HASTA : minutosDe(b.fin),
        motivo: b.motivo,
      })),
  );
  const citasRejilla: CitaRejilla[] = activas
    .map((c) => ({
      id: c.id,
      col: colDe(diaDe(c.inicio), c.profesionalId),
      desde: minutosDe(c.inicio),
      hasta: minutosDe(c.fin),
      hora: formatoHora(c.inicio),
      nombre: c.pacienteNombre,
      servicio: c.servicio.nombre,
      estado: c.estado,
      tono: c.estado === "CONFIRMADA" ? TONOS[todos.findIndex((p) => p.id === c.profesionalId) % TONOS.length] : "border-pizarra bg-[#eef1f5]",
      inicioIso: c.inicio.toISOString(),
    }))
    .filter((c) => c.col >= 0);

  const url = (p: Params) => `/panel/agenda?${new URLSearchParams(Object.entries({ vista, fecha, profesional: filtro ?? "todos", ...p }).filter(([, v]) => v) as [string, string][])}`;
  const paso = vista === "dia" ? 1 : 7;
  const titulo =
    vista === "dia"
      ? formatoDia(fecha, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `Semana del ${formatoDia(dias[0], { day: "numeric", month: "long" })} al ${formatoDia(dias.at(-1)!, { day: "numeric", month: "long", year: "numeric" })}`;

  const pestana = (activa: boolean) => `btn min-h-10 px-4 ${activa ? "bg-tinta text-white" : "border border-pizarra bg-white text-tinta hover:bg-cielo"}`;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold first-letter:uppercase">{titulo}</h1>
          <p className="mt-1 text-pizarra">
            {activas.length} {activas.length === 1 ? "cita" : "citas"}
            {canceladas.length > 0 && `, ${canceladas.length} ${canceladas.length === 1 ? "cancelada" : "canceladas"}`}. Arrastra una cita para cambiarla de hora; pulsa en un hueco libre para crear una.
          </p>
        </div>
        <Link href={`/panel/citas/nueva?dia=${fecha}${filtro ? `&profesional=${filtro}` : ""}`} className="btn btn-primario">Nueva cita</Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <nav aria-label="Moverse por la agenda" className="flex gap-2">
          <Link href={url({ fecha: sumarDias(fecha, -paso) })} className={pestana(false)}>Anterior</Link>
          <Link href={url({ fecha: hoy() })} className={pestana(false)}>Hoy</Link>
          <Link href={url({ fecha: sumarDias(fecha, paso) })} className={pestana(false)}>Siguiente</Link>
        </nav>
        <nav aria-label="Vista" className="flex gap-2">
          <Link href={url({ vista: "dia" })} aria-current={vista === "dia" ? "page" : undefined} className={pestana(vista === "dia")}>Día</Link>
          <Link href={url({ vista: "semana" })} aria-current={vista === "semana" ? "page" : undefined} className={pestana(vista === "semana")}>Semana</Link>
        </nav>
        <nav aria-label="Profesional" className="flex flex-wrap gap-2">
          <Link href={url({ profesional: "todos" })} aria-current={!filtro ? "page" : undefined} className={pestana(!filtro)}>Todos</Link>
          {todos.map((p) => (
            <Link key={p.id} href={url({ profesional: p.slug })} aria-current={filtro === p.slug ? "page" : undefined} className={pestana(filtro === p.slug)}>{p.nombre}</Link>
          ))}
        </nav>
        <form action="/panel/agenda" className="flex items-end gap-2">
          <input type="hidden" name="vista" value={vista} />
          <input type="hidden" name="profesional" value={filtro ?? "todos"} />
          <label htmlFor="fecha" className="sr-only">Ir a una fecha</label>
          <input id="fecha" type="date" name="fecha" defaultValue={fecha} className="campo min-h-10 w-auto py-1" />
          <button className={pestana(false)}>Ir</button>
        </form>
      </div>

      <div className="mt-4">
        <Rejilla columnas={columnas} nPros={pros.length} vista={vista} tramos={tramos} bloqueos={bloqueosRejilla} citas={citasRejilla} filtro={filtro ?? "todos"} />
      </div>

      {canceladas.length > 0 && (
        <section aria-labelledby="t-canceladas" className="mt-8">
          <h2 id="t-canceladas" className="text-xl font-bold">Canceladas en este periodo</h2>
          <ul className="mt-2 space-y-1">
            {canceladas.map((c) => (
              <li key={c.id}>
                <Link href={`/panel/citas/${c.id}`} className="enlace">{formatoDia(diaDe(c.inicio), { weekday: "short", day: "numeric" })}, {formatoHora(c.inicio)}: {c.pacienteNombre}</Link>{" "}
                <span className="text-pizarra">({c.servicio.nombre}, {c.profesional.nombre})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
