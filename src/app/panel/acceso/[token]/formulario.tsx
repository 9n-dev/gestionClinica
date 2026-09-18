"use client";

import { useActionState } from "react";
import { guardarPassword, type EstadoAcceso } from "@/app/panel/acciones/sesion";

export function FormularioPassword({ token, email }: { token: string; email: string }) {
  const [estado, accion, enviando] = useActionState<EstadoAcceso, FormData>(guardarPassword.bind(null, token), {});
  return (
    <form action={accion} className="space-y-4">
      {/* Para que el gestor de contraseñas guarde la nueva con su usuario */}
      <input type="hidden" name="email" value={email} autoComplete="username" />
      <div>
        <label htmlFor="password" className="etiqueta">Contraseña nueva</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} className="campo" aria-describedby="password-ayuda" />
        <p id="password-ayuda" className="mt-1 text-base text-pizarra">Mínimo 10 caracteres. Mejor una frase que un galimatías.</p>
      </div>
      <div>
        <label htmlFor="repetir" className="etiqueta">Repítela</label>
        <input id="repetir" name="repetir" type="password" autoComplete="new-password" required className="campo" />
      </div>
      <p role="alert" className="min-h-6 font-bold text-error">{estado.error}</p>
      <button className="btn btn-primario w-full" disabled={enviando}>{enviando ? "Guardando…" : "Guardar la contraseña"}</button>
    </form>
  );
}
