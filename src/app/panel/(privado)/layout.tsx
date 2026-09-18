import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { CLINICA } from "@/lib/clinica";
import { Menu } from "./Menu";

export const metadata: Metadata = { title: { default: "Panel", template: `%s · Panel ${CLINICA.nombre}` }, robots: { index: false } };
export const dynamic = "force-dynamic";

// Lo de todos los días, a la vista; lo esporádico, en «Gestión». «Nueva cita» no está aquí: es una acción, va como botón.
const ENLACES = [
  { href: "/panel/agenda", texto: "Agenda" },
  { href: "/panel/pacientes", texto: "Pacientes" },
  { href: "/panel/espera", texto: "Lista de espera" },
  { href: "/panel/caja", texto: "Caja" },
  { href: "/panel/bloqueos", texto: "Bloqueos" },
];
const GESTION = [
  { href: "/panel/estadisticas", texto: "Estadísticas", admin: true },
  { href: "/panel/emails", texto: "Emails y mensajes" },
  { href: "/panel/actividad", texto: "Actividad", admin: true },
  { href: "/panel/configuracion", texto: "Configuración", admin: true },
  { href: "/panel/usuarios", texto: "Usuarios", admin: true },
];

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  const gestion = GESTION.filter((e) => !e.admin || sesion.user.rol === "ADMIN").map(({ href, texto }) => ({ href, texto }));
  return (
    <>
      <header className="bg-tinta text-white">
        <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
          <p className="w-full font-display text-lg font-bold sm:w-auto">Panel de {CLINICA.nombre}</p>
          <Menu enlaces={ENLACES} gestion={gestion} usuario={sesion.user.nombre} />
        </div>
      </header>
      <main id="contenido" className="mx-auto w-full max-w-[100rem] px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
