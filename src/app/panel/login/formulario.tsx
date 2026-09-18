"use client";

import { useActionState } from "react";
import { entrar } from "../acciones-sesion";

/** `demo`: credenciales ya puestas, solo en modo demo. */
export function FormularioLogin({ demo }: { demo?: { email: string; password: string } }) {
  const [error, accion, enviando] = useActionState(entrar, undefined);
  return (
    <form action={accion} className="space-y-4">
      <div>
        <label htmlFor="email" className="etiqueta">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={demo?.email} className="campo" />
      </div>
      <div>
        <label htmlFor="password" className="etiqueta">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={demo?.password} className="campo" />
      </div>
      <p role="alert" className="min-h-6 font-bold text-error">{error}</p>
      <button className="btn btn-primario w-full" disabled={enviando}>{enviando ? "Entrando…" : "Entrar en el panel"}</button>
    </form>
  );
}
