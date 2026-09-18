"use client";

import { useActionState } from "react";
import { guardarPaciente, suprimirDatosPaciente, type Estado } from "../../../acciones";

export function FormularioPaciente({ p }: { p: { id: string; nombre: string; telefono: string; email: string; notas: string } }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(guardarPaciente.bind(null, p.id), {});
  return (
    <form action={accion} className="grid gap-4 rounded-lg border border-linea bg-white p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="nombre" className="etiqueta">Nombre y apellidos</label>
        <input id="nombre" name="nombre" defaultValue={p.nombre} required maxLength={80} autoComplete="off" className="campo" />
      </div>
      <div>
        <label htmlFor="telefono" className="etiqueta">Teléfono</label>
        <input id="telefono" name="telefono" type="tel" inputMode="tel" defaultValue={p.telefono} required autoComplete="off" className="campo" />
      </div>
      <div>
        <label htmlFor="email" className="etiqueta">Email (opcional)</label>
        <input id="email" name="email" type="email" defaultValue={p.email} autoComplete="off" className="campo" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="notas" className="etiqueta">Notas internas</label>
        <textarea id="notas" name="notas" rows={3} maxLength={1000} defaultValue={p.notas} className="campo" aria-describedby="notas-ayuda" />
        <p id="notas-ayuda" className="mt-1 text-base text-pizarra">Preferencias de horario, a quién llamar… Solo las ve el equipo. No es historia clínica: nada de diagnósticos ni tratamientos.</p>
      </div>
      <div className="flex items-center gap-4 sm:col-span-2">
        <button className="btn btn-secundario" disabled={enviando}>{enviando ? "Guardando…" : "Guardar ficha"}</button>
        <p role="status" className={`font-bold ${estado.error ? "text-error" : "text-exito"}`}>{estado.error ?? estado.ok}</p>
      </div>
    </form>
  );
}

export function FormularioSupresion({ id, nombre }: { id: string; nombre: string }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(suprimirDatosPaciente.bind(null, id), {});
  return (
    <details className="rounded-md border border-linea bg-white px-4 py-2.5">
      <summary className="cursor-pointer font-bold text-error">Eliminar sus datos</summary>
      <form action={accion} className="mt-3 max-w-md">
        <p className="mb-3">Se borran nombre, teléfono, email, notas y los emails guardados de {nombre}. Sus citas pasadas se quedan en la agenda sin nombre. <strong>No se puede deshacer.</strong></p>
        <button className="btn btn-peligro" disabled={enviando}>{enviando ? "Eliminando…" : "Sí, eliminar sus datos"}</button>
        {estado.error && <p role="alert" className="mt-3 font-bold text-error">{estado.error}</p>}
      </form>
    </details>
  );
}
