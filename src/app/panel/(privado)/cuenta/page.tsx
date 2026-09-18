import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { gestionaTodo } from "@/lib/permisos";
import { FormularioCambiarPassword } from "./formulario";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function Cuenta() {
  const { user } = await requerirSesion();
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold">Mi cuenta</h1>
      <dl className="mt-6 grid gap-x-8 gap-y-3 rounded-lg border border-linea bg-white p-6 sm:grid-cols-[8rem_1fr]">
        <dt className="text-pizarra">Nombre</dt><dd className="font-bold">{user.nombre}</dd>
        <dt className="text-pizarra">Email</dt><dd className="break-all">{user.email}</dd>
        <dt className="text-pizarra">Permisos</dt>
        <dd>{user.rol === "ADMIN" ? "Administración: todo, incluidos configuración y usuarios." : gestionaTodo(user) ? "Equipo: agenda, citas, pacientes y bloqueos de toda la clínica." : "Equipo: ves toda la agenda y modificas tus propias citas y bloqueos."}</dd>
      </dl>

      <h2 className="mt-10 text-2xl font-bold">Cambiar la contraseña</h2>
      {user.demo ? (
        <p className="mt-3 rounded-lg bg-ambar-claro p-4">Los usuarios de la demo tienen la contraseña fija. Crea un usuario en «Usuarios» para probarlo.</p>
      ) : (
        <>
          <p className="mt-2 text-pizarra">Al cambiarla se cierran todas tus sesiones, también esta: vuelves a entrar con la nueva.</p>
          <div className="mt-4 rounded-lg border border-linea bg-white p-6"><FormularioCambiarPassword email={user.email} /></div>
        </>
      )}
    </div>
  );
}
