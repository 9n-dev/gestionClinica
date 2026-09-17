import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CLINICA, USUARIO_DEMO } from "@/lib/clinica";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Acceso profesionales", robots: { index: false } };

export default async function Login() {
  if ((await auth())?.user) redirect("/panel/agenda");
  return (
    <main id="contenido" className="contenedor grid min-h-[80vh] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold">Panel de {CLINICA.nombre}</h1>
        <p className="mt-2 text-pizarra">Agenda, citas y bloqueos de la clínica.</p>
        <div className="mt-6 rounded-lg border border-linea bg-white p-6">
          <FormularioLogin />
        </div>
        <p className="mt-4 rounded-lg bg-ambar-claro p-4 text-base">
          Acceso de demostración, ya rellenado: <strong>{USUARIO_DEMO.email}</strong> con contraseña <strong>{USUARIO_DEMO.password}</strong>.
        </p>
        <p className="mt-6"><Link href="/" className="enlace">Volver a la web</Link></p>
      </div>
    </main>
  );
}
