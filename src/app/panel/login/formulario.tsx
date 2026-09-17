"use client";

import { useActionState } from "react";
import { USUARIO_DEMO } from "@/lib/clinica";
import { entrar } from "../acciones-sesion";

export function FormularioLogin() {
  const [error, accion, enviando] = useActionState(entrar, undefined);
  return (
    <form action={accion} className="space-y-4">
      <div>
        <label htmlFor="email" className="etiqueta">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={USUARIO_DEMO.email} className="campo" />
      </div>
      <div>
        <label htmlFor="password" className="etiqueta">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={USUARIO_DEMO.password} className="campo" />
      </div>
      <p role="alert" className="min-h-6 font-bold text-error">{error}</p>
      <button className="btn btn-primario w-full" disabled={enviando}>{enviando ? "Entrando…" : "Entrar en el panel"}</button>
    </form>
  );
}
