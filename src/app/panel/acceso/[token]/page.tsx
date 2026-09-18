import type { Metadata } from "next";
import Link from "next/link";
import { usuarioDeToken } from "@/lib/acceso";
import { FormularioPassword } from "./formulario";

export const metadata: Metadata = { title: "Elegir contraseña", robots: { index: false }, referrer: "no-referrer" };

export default async function Acceso({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const usuario = await usuarioDeToken(token);
  return (
    <main id="contenido" className="contenedor grid min-h-[80vh] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold">Elige tu contraseña</h1>
        {usuario ? (
          <>
            <p className="mt-2 text-pizarra">Para el usuario <strong className="break-all">{usuario.email}</strong>.</p>
            <div className="mt-6 rounded-lg border border-linea bg-white p-6">
              <FormularioPassword token={token} email={usuario.email} />
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-lg bg-ambar-claro p-4">Este enlace ha caducado o ya se ha usado. <Link href="/panel/recuperar" className="enlace">Pide uno nuevo</Link>.</p>
        )}
        <p className="mt-6"><Link href="/panel/login" className="enlace">Volver al acceso</Link></p>
      </div>
    </main>
  );
}
