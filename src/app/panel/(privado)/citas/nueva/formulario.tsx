"use client";

import { useActionState } from "react";
import { crearCitaPanel } from "@/app/panel/acciones/citas";
import { type Estado } from "@/app/panel/acciones/comun";

type Props = { servicio: string; profesional: string; dia: string; horas: string[]; horaInicial?: string; paciente?: Record<string, string> };

export function FormularioCitaPanel({ horas, horaInicial, paciente, ...fijos }: Props) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(crearCitaPanel, {});
  const campo = (nombre: string) => ({
    id: nombre,
    name: nombre,
    className: "campo",
    defaultValue: estado.valores?.[nombre] ?? paciente?.[nombre],
    "aria-invalid": estado.campos?.[nombre] ? true : undefined,
    "aria-describedby": estado.campos?.[nombre] ? `${nombre}-error` : undefined,
  });
  const error = (nombre: string) => estado.campos?.[nombre] && <p id={`${nombre}-error`} className="mt-1 font-bold text-error">{estado.campos[nombre]![0]}</p>;

  return (
    <form action={accion} className="grid gap-4 rounded-lg border border-linea bg-white p-6 sm:grid-cols-2" noValidate>
      {Object.entries(fijos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {estado.error && <p role="alert" className="font-bold text-error sm:col-span-2">{estado.error}</p>}
      <div className="sm:col-span-2">
        <label htmlFor="hora" className="etiqueta">Hora</label>
        <select {...campo("hora")} defaultValue={estado.valores?.hora ?? horaInicial} required>
          {horas.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        {error("hora")}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="nombre" className="etiqueta">Nombre y apellidos del paciente</label>
        <input {...campo("nombre")} type="text" required maxLength={80} autoComplete="off" />
        {error("nombre")}
      </div>
      <div>
        <label htmlFor="telefono" className="etiqueta">Teléfono</label>
        <input {...campo("telefono")} type="tel" required inputMode="tel" autoComplete="off" />
        {error("telefono")}
      </div>
      <div>
        <label htmlFor="email" className="etiqueta">Email (opcional)</label>
        <input {...campo("email")} type="email" autoComplete="off" aria-describedby="email-ayuda" />
        <p id="email-ayuda" className="mt-1 text-base text-pizarra">Si lo pones, recibe confirmación y recordatorio.</p>
        {error("email")}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="notas" className="etiqueta">Notas internas (opcional)</label>
        <textarea {...campo("notas")} rows={2} maxLength={1000} />
      </div>
      <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <legend className="etiqueta">Repetir (por ejemplo, una quiropodia cada seis semanas)</legend>
        <div>
          <label htmlFor="repetirCada" className="sr-only">Cada cuánto</label>
          <select {...campo("repetirCada")} defaultValue={estado.valores?.repetirCada ?? "0"}>
            <option value="0">No se repite</option>
            {[1, 2, 3, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{n === 1 ? "Cada semana" : `Cada ${n} semanas`}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="veces" className="sr-only">Cuántas citas en total</label>
          <select {...campo("veces")} defaultValue={estado.valores?.veces ?? "4"}>
            {[2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} citas en total</option>)}
          </select>
        </div>
        <p className="text-base text-pizarra sm:col-span-2">Mismo día de la semana y misma hora. Si alguna fecha no tiene hueco, se salta y te lo decimos.</p>
      </fieldset>
      <div className="sm:col-span-2">
        <button className="btn btn-primario" disabled={enviando}>{enviando ? "Guardando…" : "Crear la cita"}</button>
      </div>
    </form>
  );
}
