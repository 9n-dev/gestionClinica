import type { Metadata } from "next";
import Link from "next/link";
import { CLINICA } from "@/lib/clinica";
import { prisma } from "@/lib/db";
import { resumirHorario } from "@/lib/horario";

export const metadata: Metadata = {
  title: "Equipo",
  description: `Los podólogos colegiados de ${CLINICA.nombre}, en ${CLINICA.ciudad}: quiénes son, qué hace cada uno y cuándo pasa consulta.`,
};

const iniciales = (nombre: string) => nombre.replace(/^Dra?\.\s*/, "").split(" ").map((x) => x[0]).join("");

export default async function Equipo() {
  const [profesionales, nServicios] = await Promise.all([
    prisma.profesional.findMany({ where: { activo: true }, orderBy: { orden: "asc" }, include: { horarios: true, servicios: { where: { activo: true }, orderBy: { orden: "asc" }, select: { nombre: true } } } }),
    prisma.servicio.count({ where: { activo: true } }),
  ]);
  const lista = (xs: string[]) => new Intl.ListFormat("es", { type: "conjunction" }).format(xs);
  return (
    <div className="contenedor py-12">
      <h1 className="text-5xl font-extrabold">El equipo</h1>
      <p className="mt-4 max-w-[60ch] text-xl text-pizarra">{profesionales.length === 2 ? "Somos dos podólogos colegiados. Siempre te atiende uno de nosotros, de principio a fin." : "Podólogos colegiados. Siempre te atiende la misma persona, de principio a fin."}</p>
      <div className="mt-12 space-y-14">
        {profesionales.map((p) => (
          <article key={p.id} className="grid gap-6 md:grid-cols-[11rem_1fr]">
            <div aria-hidden="true" className="grid size-44 place-items-center rounded-lg bg-cielo font-display text-6xl font-extrabold text-cobalto">
              {iniciales(p.nombre)}
            </div>
            <div className="max-w-[68ch]">
              <h2 className="text-3xl font-bold">{p.nombre}</h2>
              <p className="mt-1 text-pizarra">{p.titulo}</p>
              <p className="mt-4">{p.bio}</p>
              {/* Días y servicios salen de lo que hay en Configuración, no de un texto que se queda viejo */}
              {p.horarios.length > 0 && (
                <p className="mt-3">Pasa consulta {lista(resumirHorario(p.horarios).texto.filter((h) => h.horas !== "Cerrado").map((h) => `${h.dias.toLowerCase()} (${h.horas})`))}.</p>
              )}
              {p.servicios.length > 0 && p.servicios.length < nServicios && <p className="mt-2">Atiende: {lista(p.servicios.map((x) => x.nombre.toLowerCase()))}.</p>}
              <Link href={`/reservar?profesional=${p.slug}`} className="btn btn-secundario mt-5">
                Pedir cita con {p.nombre.replace(/^Dra?\.\s*/, "").split(" ")[0]}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
