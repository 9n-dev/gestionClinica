import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Equipo",
  description: "Dra. Laura Serrano y Dr. Marcos Ortiz, podólogos colegiados en Getafe.",
};

const iniciales = (nombre: string) => nombre.replace(/^Dra?\.\s*/, "").split(" ").map((x) => x[0]).join("");

export default async function Equipo() {
  const profesionales = await prisma.profesional.findMany({ where: { activo: true }, orderBy: { orden: "asc" }, include: { horarios: true } });
  return (
    <div className="contenedor py-12">
      <h1 className="text-5xl font-extrabold">El equipo</h1>
      <p className="mt-4 max-w-[60ch] text-xl text-pizarra">Somos dos podólogos colegiados. Siempre te atiende uno de nosotros, de principio a fin.</p>
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
              <p className="mt-3">
                Pasa consulta de lunes a viernes{p.horarios.some((h) => h.diaSemana === 6) ? " y los sábados por la mañana" : ""}.
              </p>
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
