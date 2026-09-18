"use client";

import { useActionState } from "react";
import { crearPaciente, type Estado } from "../../acciones";

export function FormularioNuevoPaciente() {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(crearPaciente, {});
  const v = estado.valores ?? {};
  return (
    <form action={accion} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="nuevo-nombre" className="etiqueta">Nombre y apellidos</label>
        <input id="nuevo-nombre" name="nombre" defaultValue={v.nombre} required maxLength={80} autoComplete="off" className="campo" />
      </div>
      <div>
        <label htmlFor="nuevo-telefono" className="etiqueta">Teléfono</label>
        <input id="nuevo-telefono" name="telefono" type="tel" inputMode="tel" defaultValue={v.telefono} required autoComplete="off" className="campo" />
      </div>
      <div>
        <label htmlFor="nuevo-email" className="etiqueta">Email (opcional)</label>
        <input id="nuevo-email" name="email" type="email" defaultValue={v.email} autoComplete="off" className="campo" />
      </div>
      <input type="hidden" name="notas" value="" />
      <div className="flex items-center gap-4 sm:col-span-2">
        <button className="btn btn-secundario" disabled={enviando}>{enviando ? "Creando…" : "Crear la ficha"}</button>
        {estado.error && <p role="alert" className="font-bold text-error">{estado.error}</p>}
      </div>
    </form>
  );
}
