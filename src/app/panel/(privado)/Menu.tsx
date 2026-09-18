"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { salir } from "@/app/panel/acciones/sesion";

type Enlace = { href: string; texto: string };

const item = "inline-flex min-h-11 items-center rounded-md px-3 font-bold text-white hover:bg-white/15";
// Dónde estás: subrayado ámbar, el mismo acento del botón de «Nueva cita».
const actual = "shadow-[inset_0_-3px_0_var(--color-ambar)]";
const panel = "absolute top-full z-40 mt-1 min-w-56 rounded-lg border border-linea bg-white p-1.5 text-tinta shadow-lg";
const opcion = "flex min-h-11 w-full items-center rounded-md px-3 text-left font-bold text-tinta hover:bg-cielo";

export function Menu({ enlaces, gestion, usuario }: { enlaces: Enlace[]; gestion: Enlace[]; usuario: string }) {
  const ruta = usePathname();
  const nav = useRef<HTMLDivElement>(null);
  const estaEn = (href: string) => ruta === href || ruta.startsWith(`${href}/`);

  // Los desplegables son <details>: funcionan sin JavaScript. Con él, además se cierran al pulsar fuera o con Escape.
  // (Al cambiar de página se cierran solos: llevan la ruta como key.)
  useEffect(() => {
    const cerrar = (fuera?: EventTarget | null) => nav.current?.querySelectorAll("details[open]").forEach((d) => (!fuera || !d.contains(fuera as Node)) && d.removeAttribute("open"));
    const alPulsar = (e: PointerEvent) => cerrar(e.target);
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("pointerdown", alPulsar);
    document.addEventListener("keydown", alTeclear);
    return () => { document.removeEventListener("pointerdown", alPulsar); document.removeEventListener("keydown", alTeclear); };
  }, []);

  const flecha = <svg aria-hidden="true" viewBox="0 0 12 12" className="ml-1.5 size-3 fill-current"><path d="M2 4l4 4 4-4z" /></svg>;
  const enlace = (e: Enlace, clase: string, claseActual: string) => (
    <li key={e.href}><Link href={e.href} aria-current={estaEn(e.href) ? "page" : undefined} className={`${clase} ${estaEn(e.href) ? claseActual : ""}`}>{e.texto}</Link></li>
  );
  return (
    <div ref={nav} className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 sm:w-auto sm:flex-1 sm:justify-end sm:gap-x-4 xl:justify-between xl:gap-x-6">
      <nav aria-label="Panel" className="xl:flex-1">
        {/* Móvil y tablet: todo en un desplegable. En línea, las entradas solo caben a partir de 1280 px; más estrecho, se partían en tres filas. */}
        <details key={`movil${ruta}`} className="relative xl:hidden">
          <summary className={`${item} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Menú{flecha}</summary>
          <ul className={`${panel} left-0 w-[calc(100vw-2rem)] max-w-sm`}>{[...enlaces, ...gestion].map((e) => enlace(e, opcion, "bg-cielo"))}</ul>
        </details>
        <ul className="hidden flex-wrap gap-1 xl:flex">
          {enlaces.map((e) => enlace(e, item, actual))}
          {/* Un menú con una sola entrada es un enlace con un clic de más */}
          {gestion.length === 1 && enlace(gestion[0], item, actual)}
          {gestion.length > 1 && (
            <li>
              <details key={ruta} className="relative">
                <summary className={`${item} cursor-pointer list-none [&::-webkit-details-marker]:hidden ${gestion.some((e) => estaEn(e.href)) ? actual : ""}`}>Gestión{flecha}</summary>
                <ul className={`${panel} left-0`}>{gestion.map((e) => enlace(e, opcion, "bg-cielo"))}</ul>
              </details>
            </li>
          )}
        </ul>
      </nav>

      <Link href="/panel/citas/nueva" className="inline-flex min-h-11 items-center rounded-md bg-ambar px-4 font-bold text-tinta hover:brightness-95">Nueva cita</Link>
      <details key={`cuenta${ruta}`} className="relative">
        <summary className={`${item} cursor-pointer list-none [&::-webkit-details-marker]:hidden ${estaEn("/panel/cuenta") ? actual : ""}`}>
          <span className="sr-only">Cuenta de {usuario}</span>
          <span aria-hidden="true" className="2xl:hidden">Cuenta</span>
          <span aria-hidden="true" className="hidden 2xl:inline">{usuario}</span>
          {flecha}
        </summary>
        <ul className={`${panel} right-0`}>
          <li><Link href="/panel/cuenta" className={opcion}>Mi cuenta</Link></li>
          <li><Link href="/" className={opcion}>Ver la web</Link></li>
          <li><form action={salir}><button className={`${opcion} cursor-pointer`}>Salir</button></form></li>
        </ul>
      </details>
    </div>
  );
}
