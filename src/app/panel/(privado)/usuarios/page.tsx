import type { Metadata } from "next";
import { requerirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FormularioUsuario } from "./formularios";

export const metadata: Metadata = { title: "Usuarios" };

export default async function Usuarios() {
  const sesion = await requerirAdmin();
  const [usuarios, profesionales] = await Promise.all([
    prisma.usuario.findMany({ orderBy: [{ demo: "desc" }, { nombre: "asc" }], select: { id: true, email: true, nombre: true, rol: true, demo: true, profesionalId: true, accesoExpira: true } }),
    prisma.profesional.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
  ]);
  const ahora = new Date();
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold">Usuarios</h1>
      <p className="mt-2 max-w-[70ch] text-pizarra">
        Quién entra al panel. <strong>Equipo</strong> lleva agenda, citas, pacientes y bloqueos; <strong>Administración</strong> cambia además la configuración y los usuarios.
        Nadie escribe la contraseña de otro: el usuario nuevo recibe un enlace para elegirla.
      </p>

      <section aria-labelledby="t-nuevo" className="mt-8">
        <h2 id="t-nuevo" className="text-2xl font-bold">Nuevo usuario</h2>
        <div className="mt-4"><FormularioUsuario profesionales={profesionales} /></div>
      </section>

      <section aria-labelledby="t-lista" className="mt-10">
        <h2 id="t-lista" className="text-2xl font-bold">Usuarios actuales</h2>
        <div className="mt-4 space-y-4">
          {usuarios.map(({ accesoExpira, ...u }) => (
            <FormularioUsuario key={u.id} u={u} profesionales={profesionales} soyYo={u.id === sesion.user.id} invitacionPendiente={!!accesoExpira && accesoExpira > ahora} />
          ))}
        </div>
      </section>
    </div>
  );
}
