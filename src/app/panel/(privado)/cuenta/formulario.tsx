"use client";

import { useActionState } from "react";
import { cambiarPassword, type EstadoAcceso } from "../../acciones-sesion";

export function FormularioCambiarPassword({ email }: { email: string }) {
  const [estado, accion, enviando] = useActionState<EstadoAcceso, FormData>(cambiarPassword, {});
  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="email" value={email} autoComplete="username" />
      <div>
        <label htmlFor="actual" className="etiqueta">Contraseña actual</label>
        <input id="actual" name="actual" type="password" autoComplete="current-password" required className="campo" />
      </div>
      <div>
        <label htmlFor="password" className="etiqueta">Contraseña nueva</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} className="campo" aria-describedby="password-ayuda" />
        <p id="password-ayuda" className="mt-1 text-base text-pizarra">Mínimo 10 caracteres.</p>
      </div>
      <div>
        <label htmlFor="repetir" className="etiqueta">Repítela</label>
        <input id="repetir" name="repetir" type="password" autoComplete="new-password" required className="campo" />
      </div>
      <p role="alert" className="min-h-6 font-bold text-error">{estado.error}</p>
      <button className="btn btn-primario" disabled={enviando}>{enviando ? "Guardando…" : "Cambiar la contraseña"}</button>
    </form>
  );
}
