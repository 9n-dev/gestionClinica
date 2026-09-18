"use client";

import { useActionState } from "react";
import { FORMAS_PAGO } from "@/lib/validacion";
import { cobrarCita, guardarNotas, moverDesdeFormulario } from "@/app/panel/acciones/citas";
import { type Estado } from "@/app/panel/acciones/comun";

export function FormularioNotas({ id, notas }: { id: string; notas: string | null }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(guardarNotas.bind(null, id), {});
  return (
    <form action={accion}>
      <label htmlFor="notas" className="etiqueta">Notas internas</label>
      <textarea id="notas" name="notas" rows={3} maxLength={1000} defaultValue={notas ?? ""} className="campo" aria-describedby="notas-ayuda" />
      <p id="notas-ayuda" className="mt-1 text-base text-pizarra">Solo las ve el equipo. No es historia clínica: nada de diagnósticos ni tratamientos.</p>
      <div className="mt-3 flex items-center gap-4">
        <button className="btn btn-secundario" disabled={enviando}>{enviando ? "Guardando…" : "Guardar notas"}</button>
        <p role="status" className={`font-bold ${estado.error ? "text-error" : "text-exito"}`}>{estado.error ?? estado.ok}</p>
      </div>
    </form>
  );
}

export function FormularioMover({ id, profesional, dia, horas, horaActual }: { id: string; profesional: string; dia: string; horas: string[]; horaActual?: string }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(moverDesdeFormulario.bind(null, id), {});
  return (
    <form action={accion} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="profesional" value={profesional} />
      <input type="hidden" name="dia" value={dia} />
      <div>
        <label htmlFor="hora" className="etiqueta">Hora nueva</label>
        <select id="hora" name="hora" defaultValue={horaActual && horas.includes(horaActual) ? horaActual : horas[0]} className="campo min-w-32">
          {horas.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <button className="btn btn-primario" disabled={enviando}>{enviando ? "Moviendo…" : "Mover la cita"}</button>
      {estado.error && <p role="alert" className="w-full font-bold text-error">{estado.error}</p>}
    </form>
  );
}

export function FormularioCobro({ id, tarifa }: { id: string; tarifa: number }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(cobrarCita.bind(null, id), {});
  return (
    <form action={accion} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="importe" className="etiqueta">Importe (€)</label>
        <input id="importe" name="importe" type="number" min={0} max={9999} step={0.01} defaultValue={tarifa} required className="campo w-32" aria-describedby="importe-ayuda" />
      </div>
      <div>
        <label htmlFor="formaPago" className="etiqueta">Forma de pago</label>
        <select id="formaPago" name="formaPago" className="campo">{Object.entries(FORMAS_PAGO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <button className="btn btn-primario" disabled={enviando}>{enviando ? "Guardando…" : "Marcar como cobrada"}</button>
      <p id="importe-ayuda" className="w-full text-base text-pizarra">Sale la tarifa de cuando se reservó; cámbiala si hay descuento.</p>
      {estado.error && <p role="alert" className="w-full font-bold text-error">{estado.error}</p>}
    </form>
  );
}
