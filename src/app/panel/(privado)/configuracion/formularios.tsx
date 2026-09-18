"use client";

import { useActionState } from "react";
import { minutosAHora } from "@/lib/fechas";
import { guardarHorario, guardarProfesional, guardarServicio, type Estado } from "../../acciones";

function Resultado({ estado }: { estado: Estado }) {
  return <p role="status" className={`font-bold ${estado.error ? "text-error" : "text-exito"}`}>{estado.error ?? estado.ok}</p>;
}

type Servicio = { id: string; nombre: string; descripcion: string; duracionMin: number; precioCent: number; activo: boolean };

/** Sin `s`, alta de un servicio nuevo. */
export function FormularioServicio({ s }: { s?: Servicio }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(guardarServicio.bind(null, s?.id ?? null), {});
  const id = (c: string) => `${c}-${s?.id ?? "nuevo-servicio"}`;
  return (
    <form action={accion} className="grid gap-3 rounded-lg border border-linea bg-white p-5 sm:grid-cols-[1fr_7rem_7rem]">
      <div className="sm:col-span-3">
        <label htmlFor={id("nombre")} className="etiqueta">Nombre</label>
        <input id={id("nombre")} name="nombre" defaultValue={s?.nombre} required maxLength={80} className="campo" />
      </div>
      <div className="sm:col-span-3">
        <label htmlFor={id("descripcion")} className="etiqueta">Descripción (se muestra en la web)</label>
        <textarea id={id("descripcion")} name="descripcion" defaultValue={s?.descripcion} required rows={2} maxLength={500} className="campo" />
      </div>
      <div className="flex items-center gap-2 self-end">
        <input id={id("activo")} name="activo" type="checkbox" defaultChecked={s?.activo ?? true} className="size-5 accent-cobalto" />
        <label htmlFor={id("activo")}>Se ofrece en la web</label>
      </div>
      <div>
        <label htmlFor={id("duracionMin")} className="etiqueta">Minutos</label>
        <input id={id("duracionMin")} name="duracionMin" type="number" min={15} max={240} step={15} defaultValue={s?.duracionMin} required className="campo" />
      </div>
      <div>
        <label htmlFor={id("precio")} className="etiqueta">Precio (€)</label>
        <input id={id("precio")} name="precio" type="number" min={0} max={9999} step={0.5} defaultValue={s && s.precioCent / 100} required className="campo" />
      </div>
      <div className="flex items-center gap-4 sm:col-span-3">
        <button className="btn btn-secundario" disabled={enviando}>{enviando ? "Guardando…" : s ? "Guardar" : "Añadir servicio"}</button>
        <Resultado estado={estado} />
      </div>
    </form>
  );
}

type Profesional = { id: string; nombre: string; titulo: string; bio: string; activo: boolean; servicios: { id: string }[]; horarios: { diaSemana: number; minInicio: number; minFin: number }[] };
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const hhmm = (min?: number) => (min === undefined ? "" : minutosAHora(min).padStart(5, "0"));

/** Sin `p`, alta de un profesional nuevo. */
export function FormularioProfesional({ p, servicios }: { p?: Omit<Profesional, "horarios">; servicios: { id: string; nombre: string }[] }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(guardarProfesional.bind(null, p?.id ?? null), {});
  const id = (c: string) => `${c}-${p?.id ?? "nuevo-profesional"}`;
  return (
    <form action={accion} className="grid gap-3 rounded-lg border border-linea bg-white p-5">
      <div>
        <label htmlFor={id("nombre")} className="etiqueta">Nombre</label>
        <input id={id("nombre")} name="nombre" defaultValue={p?.nombre} required maxLength={80} className="campo" />
      </div>
      <div>
        <label htmlFor={id("titulo")} className="etiqueta">Título y colegiado</label>
        <input id={id("titulo")} name="titulo" defaultValue={p?.titulo} required maxLength={160} className="campo" />
      </div>
      <div>
        <label htmlFor={id("bio")} className="etiqueta">Presentación (página de equipo)</label>
        <textarea id={id("bio")} name="bio" defaultValue={p?.bio} required rows={4} maxLength={1000} className="campo" />
      </div>
      <fieldset>
        <legend className="etiqueta">Servicios que hace</legend>
        <div className="mt-1 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {servicios.map((s) => (
            <label key={s.id} className="flex items-center gap-2">
              <input name="servicios" value={s.id} type="checkbox" defaultChecked={p ? p.servicios.some((x) => x.id === s.id) : true} className="size-5 accent-cobalto" />
              {s.nombre}
            </label>
          ))}
        </div>
        <p className="mt-1 text-base text-pizarra">En la reserva solo se le ofrece para estos.</p>
      </fieldset>
      <div className="flex items-center gap-2">
        <input id={id("activo")} name="activo" type="checkbox" defaultChecked={p?.activo ?? true} className="size-5 accent-cobalto" />
        <label htmlFor={id("activo")}>Activo: aparece en la web y admite citas</label>
      </div>
      <div className="flex items-center gap-4">
        <button className="btn btn-secundario" disabled={enviando}>{enviando ? "Guardando…" : p ? "Guardar" : "Añadir profesional"}</button>
        <Resultado estado={estado} />
      </div>
    </form>
  );
}

export function FormularioHorario({ p }: { p: Profesional }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(guardarHorario.bind(null, p.id), {});
  // Por día, primer tramo = mañana, segundo = tarde
  const tramosDe = (d: number) => p.horarios.filter((h) => h.diaSemana === d).sort((a, b) => a.minInicio - b.minInicio);
  return (
    <form action={accion} className="rounded-lg border border-linea bg-white p-5">
      <table className="w-full">
        <thead>
          <tr className="text-left text-pizarra">
            <th scope="col" className="pb-2 font-normal">Día</th>
            <th scope="col" className="pb-2 font-normal" colSpan={2}>Mañana</th>
            <th scope="col" className="pb-2 font-normal" colSpan={2}>Tarde</th>
          </tr>
        </thead>
        <tbody>
          {DIAS.map((nombre, i) => {
            const d = i + 1;
            const [m, t] = tramosDe(d);
            const celda = (k: string, v: string, etiqueta: string) => (
              <td className="py-1 pr-2">
                <label className="sr-only" htmlFor={`${k}-${p.id}`}>{etiqueta}</label>
                <input id={`${k}-${p.id}`} name={k} type="time" step={900} defaultValue={v} className="campo min-h-10 px-2 py-1" />
              </td>
            );
            return (
              <tr key={d}>
                <th scope="row" className="py-1 pr-3 text-left font-bold">{nombre}</th>
                {celda(`m${d}i`, hhmm(m?.minInicio), `${nombre}, mañana, desde`)}
                {celda(`m${d}f`, hhmm(m?.minFin), `${nombre}, mañana, hasta`)}
                {celda(`t${d}i`, hhmm(t?.minInicio), `${nombre}, tarde, desde`)}
                {celda(`t${d}f`, hhmm(t?.minFin), `${nombre}, tarde, hasta`)}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-base text-pizarra">Deja un tramo vacío si ese día no se trabaja. Las horas van de 15 en 15 minutos.</p>
      <div className="mt-3 flex items-center gap-4">
        <button className="btn btn-secundario" disabled={enviando}>{enviando ? "Guardando…" : "Guardar horario"}</button>
        <Resultado estado={estado} />
      </div>
    </form>
  );
}
