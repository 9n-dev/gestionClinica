import type { Metadata } from "next";
import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { CLINICA } from "@/lib/clinica";
import { salir } from "../acciones-sesion";

export const metadata: Metadata = { title: { default: "Panel", template: `%s · Panel ${CLINICA.nombre}` }, robots: { index: false } };
export const dynamic = "force-dynamic";

const ENLACES = [
  { href: "/panel/agenda", texto: "Agenda" },
  { href: "/panel/citas/nueva", texto: "Nueva cita" },
  { href: "/panel/bloqueos", texto: "Bloqueos" },
  { href: "/panel/configuracion", texto: "Configuración" },
  { href: "/panel/emails", texto: "Emails enviados" },
];

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  const item = "inline-flex min-h-11 items-center rounded-md px-3 font-bold text-white hover:bg-white/15";
  return (
    <>
      <header className="bg-tinta text-white">
        <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
          <p className="font-display text-lg font-bold">Panel de {CLINICA.nombre}</p>
          <nav aria-label="Panel" className="flex-1">
            <ul className="flex flex-wrap gap-1">
              {ENLACES.map((e) => <li key={e.href}><Link href={e.href} className={item}>{e.texto}</Link></li>)}
            </ul>
          </nav>
          <Link href="/" className={item}>Ver la web</Link>
          <form action={salir}>
            <button className={`${item} cursor-pointer`}>Salir<span className="sr-only"> ({sesion.user?.email})</span></button>
          </form>
        </div>
      </header>
      <main id="contenido" className="mx-auto w-full max-w-[100rem] px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
