import Link from "next/link";
import { CLINICA } from "@/lib/clinica";

const ENLACES = [
  { href: "/servicios", texto: "Servicios" },
  { href: "/equipo", texto: "Equipo" },
  { href: "/contacto", texto: "Contacto" },
];

export function Cabecera() {
  return (
    <header className="border-b border-linea bg-white">
      <div className="contenedor flex flex-wrap items-center gap-x-8 gap-y-2 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-tinta no-underline">
          <Marca />
          {CLINICA.nombre}
        </Link>
        <nav aria-label="Principal" className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
          <ul className="flex gap-1 sm:justify-end">
            {ENLACES.map((e) => (
              <li key={e.href}>
                <Link href={e.href} className="inline-flex min-h-11 items-center rounded-md px-3 font-bold text-tinta hover:bg-cielo">{e.texto}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link href="/reservar" className="btn btn-primario ml-auto sm:ml-0">Pedir cita</Link>
      </div>
    </header>
  );
}

// Tres isobaras: la versión mínima de la huella de la portada.
function Marca() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <ellipse cx="16" cy="16" rx="12" ry="15" fill="#dce6fb" />
      <ellipse cx="16.5" cy="17" rx="8" ry="10" fill="#2346c4" />
      <ellipse cx="17" cy="18" rx="3.5" ry="4.5" fill="#f0b33c" />
    </svg>
  );
}
