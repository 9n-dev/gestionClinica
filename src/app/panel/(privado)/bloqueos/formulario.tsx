"use client";

import { useActionState } from "react";
import { crearBloqueo, type Estado } from "../../acciones";

export function FormularioBloqueo({ profesionales, todaLaClinica, porDefecto }: { profesionales: { id: string; nombre: string }[]; todaLaClinica: boolean; porDefecto: string }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(crearBloqueo, {});
  return (
    <form action={accion} className="grid gap-4 rounded-lg border border-linea bg-white p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="profesionalId" className="etiqueta">A quién afecta</label>
        <select id="profesionalId" name="profesionalId" className="campo">
          {todaLaClinica && <option value="">Toda la clínica</option>}
          {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="inicio" className="etiqueta">Desde</label>
        <input id="inicio" name="inicio" type="datetime-local" required step={900} defaultValue={`${porDefecto}T14:00`} className="campo" />
      </div>
      <div>
        <label htmlFor="fin" className="etiqueta">Hasta</label>
        <input id="fin" name="fin" type="datetime-local" required step={900} defaultValue={`${porDefecto}T16:00`} className="campo" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="motivo" className="etiqueta">Motivo</label>
        <input id="motivo" name="motivo" type="text" required maxLength={120} placeholder="Vacaciones, comida, formación…" className="campo" />
      </div>
      <div className="sm:col-span-2">
        <button className="btn btn-primario" disabled={enviando}>{enviando ? "Guardando…" : "Bloquear estas horas"}</button>
        <p role="status" className={`mt-3 font-bold ${estado.error ? "text-error" : "text-exito"}`}>{estado.error ?? estado.ok}</p>
      </div>
    </form>
  );
}
