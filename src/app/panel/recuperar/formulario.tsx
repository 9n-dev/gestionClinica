"use client";

import { useActionState } from "react";
import { pedirAcceso, type EstadoAcceso } from "../acciones-sesion";

export function FormularioRecuperar() {
  const [estado, accion, enviando] = useActionState<EstadoAcceso, FormData>(pedirAcceso, {});
  if (estado.ok) return <p role="status" className="font-bold text-exito">{estado.ok}</p>;
  return (
    <form action={accion} className="space-y-4">
      <div>
        <label htmlFor="email" className="etiqueta">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="campo" />
      </div>
      <p role="alert" className="min-h-6 font-bold text-error">{estado.error}</p>
      <button className="btn btn-primario w-full" disabled={enviando}>{enviando ? "Enviando…" : "Enviarme el enlace"}</button>
    </form>
  );
}
