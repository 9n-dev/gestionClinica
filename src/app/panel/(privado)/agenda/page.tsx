import type { Metadata } from "next";
import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aInstante, diaDe, diaSemana, esDia, formatoDia, formatoHora, hoy, lunesDe, minutosAHora, minutosDe, sumarDias, type Dia } from "@/lib/fechas";

export const metadata: Metadata = { title: "Agenda" };

// La rejilla cubre de 9:00 a 20:00 en filas de 15 min.
const DESDE = 9 * 60;
const HASTA = 20 * 60;
const FILA = 15;
const FILAS = (HASTA - DESDE) / FILA;
const CABECERAS = 2;

const fila = (min: number) => Math.round((Math.min(Math.max(min, DESDE), HASTA) - DESDE) / FILA) + 1 + CABECERAS;
const TONOS = ["border-cobalto bg-cielo", "border-exito bg-pino-claro"];
const iniciales = (nombre: string) => nombre.replace(/^Dra?\.\s*/, "").split(" ").map((x) => x[0]).join("");

type Params = { vista?: string; fecha?: string; profesional?: string };

export default async function Agenda({ searchParams }: { searchParams: Promise<Params> }) {
  await requerirSesion();
  const sp = await searchParams;
  const vista = sp.vista === "semana" ? "semana" : "dia";
  const fecha: Dia = esDia(sp.fecha) ? sp.fecha : hoy();

  const todos = await prisma.profesional.findMany({ where: { activo: true }, orderBy: { orden: "asc" }, include: { horarios: true } });
  const pros = todos.filter((p) => !sp.profesional || p.slug === sp.profesional);
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

  const columnas = dias.flatMap((dia) => pros.map((pro) => ({ dia, pro })));
  const url = (p: Params) => `/panel/agenda?${new URLSearchParams(Object.entries({ vista, fecha, profesional: filtro, ...p }).filter(([, v]) => v) as [string, string][])}`;
  const paso = vista === "dia" ? 1 : 7;
  const titulo =
    vista === "dia"
      ? formatoDia(fecha, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `Semana del ${formatoDia(dias[0], { day: "numeric", month: "long" })} al ${formatoDia(dias.at(-1)!, { day: "numeric", month: "long", year: "numeric" })}`;

  const pestana = (activa: boolean) => `btn min-h-10 px-4 ${activa ? "bg-tinta text-white" : "border border-pizarra bg-white text-tinta hover:bg-cielo"}`;

  return (
    <>
      <h1 className="text-3xl font-bold first-letter:uppercase">{titulo}</h1>
      <p className="mt-1 text-pizarra">
        {activas.length} {activas.length === 1 ? "cita" : "citas"}
        {canceladas.length > 0 && `, ${canceladas.length} ${canceladas.length === 1 ? "cancelada" : "canceladas"}`}
      </p>

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
          <Link href={url({ profesional: "" })} aria-current={!filtro ? "page" : undefined} className={pestana(!filtro)}>Todos</Link>
          {todos.map((p) => (
            <Link key={p.id} href={url({ profesional: p.slug })} aria-current={filtro === p.slug ? "page" : undefined} className={pestana(filtro === p.slug)}>{p.nombre}</Link>
          ))}
        </nav>
        <form action="/panel/agenda" className="flex items-end gap-2">
          <input type="hidden" name="vista" value={vista} />
          {filtro && <input type="hidden" name="profesional" value={filtro} />}
          <label htmlFor="fecha" className="sr-only">Ir a una fecha</label>
          <input id="fecha" type="date" name="fecha" defaultValue={fecha} className="campo min-h-10 w-auto py-1" />
          <button className={pestana(false)}>Ir</button>
        </form>
      </div>

      <div className="relative mt-6 overflow-x-auto rounded-lg border border-linea bg-[#e9eef5]">
        <div
          className="grid text-sm"
          style={{
            gridTemplateColumns: `3.5rem repeat(${columnas.length}, minmax(${vista === "dia" ? "14rem" : filtro ? "9rem" : "6.5rem"}, 1fr))`,
            gridTemplateRows: `auto auto repeat(${FILAS}, 1.5rem)`,
          }}
        >
          {/* Cabeceras: día y profesional */}
          {dias.map((d, i) => (
            <div key={d} style={{ gridColumn: `${i * pros.length + 2} / span ${pros.length}`, gridRow: 1 }} className={`border-l border-linea bg-white px-2 pt-2 text-center font-bold first-letter:uppercase ${d === hoy() ? "text-cobalto" : ""}`}>
              {vista === "semana" ? <Link href={url({ vista: "dia", fecha: d })} className="underline-offset-4 hover:underline">{formatoDia(d, { weekday: "short", day: "numeric" })}</Link> : formatoDia(d, { weekday: "long", day: "numeric" })}
              {d === hoy() && <span className="sr-only"> (hoy)</span>}
            </div>
          ))}
          {columnas.map((c, i) => (
            <div key={i} style={{ gridColumn: i + 2, gridRow: 2 }} className="border-b border-l border-linea bg-white px-2 pb-2 text-center text-pizarra">
              {vista === "dia" || filtro ? c.pro.nombre : <abbr title={c.pro.nombre} className="no-underline">{iniciales(c.pro.nombre)}</abbr>}
            </div>
          ))}

          {/* Horas */}
          {Array.from({ length: (HASTA - DESDE) / 60 }, (_, h) => (
            <div key={h} style={{ gridColumn: 1, gridRow: `${fila(DESDE + h * 60)} / span 4` }} className="border-t border-linea pr-2 text-right text-pizarra tabular-nums">
              {minutosAHora(DESDE + h * 60)}
            </div>
          ))}

          {/* Horario laboral en blanco; fuera de horario queda el fondo gris */}
          {columnas.flatMap((c, i) =>
            c.pro.horarios.filter((t) => t.diaSemana === diaSemana(c.dia)).map((t) => (
              <div key={`${i}-${t.id}`} style={{ gridColumn: i + 2, gridRow: `${fila(t.minInicio)} / ${fila(t.minFin)}` }} className="border-l border-linea bg-white bg-[linear-gradient(to_bottom,var(--color-linea)_1px,transparent_1px)] bg-[length:100%_6rem]" />
            )),
          )}

          {/* Bloqueos */}
          {columnas.flatMap((c, i) =>
            bloqueos
              .filter((b) => (!b.profesionalId || b.profesionalId === c.pro.id) && b.inicio < aInstante(sumarDias(c.dia, 1)) && b.fin > aInstante(c.dia))
              .map((b) => {
                const desde = b.inicio <= aInstante(c.dia) ? DESDE : minutosDe(b.inicio);
                const hasta = b.fin >= aInstante(sumarDias(c.dia, 1)) ? HASTA : minutosDe(b.fin);
                return (
                  <div key={`${i}-${b.id}`} style={{ gridColumn: i + 2, gridRow: `${fila(desde)} / ${fila(hasta)}` }} className="z-10 mx-0.5 overflow-hidden rounded border border-ambar bg-[repeating-linear-gradient(135deg,var(--color-ambar-claro)_0_8px,#fff_8px_16px)] px-1.5 py-0.5 leading-tight">
                    <span className="font-bold">Bloqueado</span> {b.motivo}
                  </div>
                );
              }),
          )}

          {/* Citas */}
          {activas.map((c) => {
            const col = columnas.findIndex((x) => x.dia === diaDe(c.inicio) && x.pro.id === c.profesionalId);
            if (col < 0) return null;
            const tono = TONOS[todos.findIndex((p) => p.id === c.profesionalId) % TONOS.length];
            return (
              <Link
                key={c.id}
                href={`/panel/citas/${c.id}`}
                style={{ gridColumn: col + 2, gridRow: `${fila(minutosDe(c.inicio))} / ${fila(minutosDe(c.fin))}` }}
                className={`z-20 mx-0.5 overflow-hidden rounded border-l-4 px-1.5 py-0.5 leading-tight text-tinta no-underline hover:brightness-95 ${c.estado === "ATENDIDA" ? "border-pizarra bg-[#eef1f5]" : tono}`}
              >
                <span className="block truncate"><span className="font-bold tabular-nums">{formatoHora(c.inicio)}</span> {c.pacienteNombre}</span>
                <span className="block truncate text-pizarra">{c.servicio.nombre}{c.estado === "ATENDIDA" && ", atendida"}</span>
              </Link>
            );
          })}
        </div>
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
