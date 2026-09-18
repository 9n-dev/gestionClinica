import type { Metadata } from "next";
import Link from "next/link";
import { MODO_DEMO } from "@/lib/clinica";
import { FormularioRecuperar } from "./formulario";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function Recuperar() {
  return (
    <main id="contenido" className="contenedor grid min-h-[80vh] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold">He olvidado mi contraseña</h1>
        <p className="mt-2 text-pizarra">Escribe el email de tu usuario y te enviamos un enlace para elegir una nueva.</p>
        <div className="mt-6 rounded-lg border border-linea bg-white p-6">
          <FormularioRecuperar />
        </div>
        {MODO_DEMO && <p className="mt-4 rounded-lg bg-ambar-claro p-4 text-base">En esta demo los usuarios de demostración tienen la contraseña fija. Crea un usuario en «Usuarios» (como administración) para probarlo: el email aparece en «Emails enviados».</p>}
        <p className="mt-6"><Link href="/panel/login" className="enlace">Volver al acceso</Link></p>
      </div>
    </main>
  );
}
