import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/auth";
import { CLINICA, USUARIO_DEMO, USUARIOS_DEMO } from "@/lib/clinica";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Acceso profesionales", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  // usuarioActual y no auth(): una cookie de un usuario borrado no debe rebotar entre el login y el panel.
  if (await usuarioActual()) redirect("/panel/agenda");
  return (
    <main id="contenido" className="contenedor grid min-h-[80vh] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold">Panel de {CLINICA.nombre}</h1>
        <p className="mt-2 text-pizarra">Agenda, citas y bloqueos de la clínica.</p>
        {(await searchParams).password && <p role="status" className="mt-4 rounded-md bg-pino-claro px-4 py-2 font-bold text-exito">Contraseña guardada. Ya puedes entrar.</p>}
        <div className="mt-6 rounded-lg border border-linea bg-white p-6">
          <FormularioLogin />
          <p className="mt-4"><Link href="/panel/recuperar" className="enlace">He olvidado mi contraseña</Link></p>
        </div>
        <div className="mt-4 rounded-lg bg-ambar-claro p-4 text-base">
          <p>Usuarios de demostración, todos con contraseña <strong>{USUARIO_DEMO.password}</strong>:</p>
          <ul className="mt-2 space-y-1">
            {USUARIOS_DEMO.map((u) => <li key={u.email}><strong>{u.email}</strong> ({u.quien})</li>)}
          </ul>
        </div>
        <p className="mt-6"><Link href="/" className="enlace">Volver a la web</Link></p>
      </div>
    </main>
  );
}
