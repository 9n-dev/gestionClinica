"use client";

import { useActionState } from "react";
import { borrarUsuario, crearUsuario, guardarUsuario, type Estado } from "../../acciones";

type Usuario = { id: string; email: string; nombre: string; rol: "ADMIN" | "EQUIPO"; demo: boolean; profesionalId: string | null };
type Props = { u?: Usuario; profesionales: { id: string; nombre: string }[]; soyYo?: boolean; invitacionPendiente?: boolean };

/** Sin `u` es el formulario de alta; con `u`, el de edición (bloqueado para los usuarios de la demo). */
export function FormularioUsuario({ u, profesionales, soyYo, invitacionPendiente }: Props) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(u ? guardarUsuario.bind(null, u.id) : crearUsuario, {});
  const id = (c: string) => `${c}-${u?.id ?? "nuevo"}`;
  const valor = (c: "nombre" | "email" | "rol" | "profesionalId") => estado.valores?.[c] ?? u?.[c] ?? undefined;
  const fijo = u?.demo;
  return (
    <form action={accion} className="grid gap-3 rounded-lg border border-linea bg-white p-5 sm:grid-cols-2">
      {u && (
        <p className="flex flex-wrap gap-2 sm:col-span-2">
          {soyYo && <span className="rounded bg-cielo px-2.5 py-0.5 font-bold text-cobalto-oscuro">Tú</span>}
          {u.demo && <span className="rounded bg-ambar-claro px-2.5 py-0.5 font-bold">Usuario de la demo: no se puede cambiar ni borrar</span>}
          {invitacionPendiente && <span className="rounded bg-ambar-claro px-2.5 py-0.5 font-bold">Tiene un enlace pendiente para elegir contraseña</span>}
        </p>
      )}
      <div>
        <label htmlFor={id("nombre")} className="etiqueta">Nombre</label>
        <input id={id("nombre")} name="nombre" defaultValue={valor("nombre")} required maxLength={80} readOnly={fijo} autoComplete="off" className="campo" />
      </div>
      <div>
        <label htmlFor={id("email")} className="etiqueta">Email</label>
        <input id={id("email")} name="email" type="email" defaultValue={valor("email")} required maxLength={200} readOnly={fijo} autoComplete="off" className="campo" />
      </div>
      <div>
        <label htmlFor={id("rol")} className="etiqueta">Rol</label>
        <select id={id("rol")} name="rol" defaultValue={valor("rol") ?? "EQUIPO"} disabled={fijo} className="campo">
          <option value="EQUIPO">Equipo</option>
          <option value="ADMIN">Administración</option>
        </select>
      </div>
      <div>
        <label htmlFor={id("profesionalId")} className="etiqueta">Es el profesional</label>
        <select id={id("profesionalId")} name="profesionalId" defaultValue={valor("profesionalId") ?? ""} disabled={fijo} className="campo" aria-describedby={id("pro-ayuda")}>
          <option value="">Ninguno (recepción, gestión…)</option>
          {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <p id={id("pro-ayuda")} className="mt-1 text-base text-pizarra">Si lo es, la agenda se le abre con su columna.</p>
      </div>
      {!fijo && (
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <button className={`btn ${u ? "btn-secundario" : "btn-primario"}`} disabled={enviando}>{enviando ? "Guardando…" : u ? "Guardar" : "Crear usuario y enviarle el enlace"}</button>
          <p role="status" className={`font-bold ${estado.error ? "text-error" : "text-exito"}`}>{estado.error ?? estado.ok}</p>
          {u && !soyYo && (
            <details className="ml-auto rounded-md border border-linea px-4 py-2.5">
              <summary className="cursor-pointer font-bold text-error">Borrar usuario</summary>
              <p className="my-3">Deja de poder entrar al momento. No se puede deshacer.</p>
              <button formAction={borrarUsuario.bind(null, u.id)} formNoValidate className="btn btn-peligro">Sí, borrar a {u.nombre}</button>
            </details>
          )}
        </div>
      )}
    </form>
  );
}
