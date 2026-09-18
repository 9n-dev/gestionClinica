import type { Metadata } from "next";
import { requerirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FormularioHorario, FormularioProfesional, FormularioServicio } from "./formularios";

export const metadata: Metadata = { title: "Configuración" };

export default async function Configuracion() {
  await requerirAdmin();
  const [servicios, profesionales] = await Promise.all([
    prisma.servicio.findMany({ orderBy: { orden: "asc" } }),
    prisma.profesional.findMany({ orderBy: { orden: "asc" }, include: { horarios: true, servicios: { select: { id: true } } } }),
  ]);
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold">Configuración</h1>
      <p className="mt-2 text-pizarra">Servicios, precios, profesionales y horarios. Los cambios se ven en la web al momento y no afectan a las citas que ya existen.</p>

      <section aria-labelledby="t-servicios" className="mt-8">
        <h2 id="t-servicios" className="text-2xl font-bold">Servicios y precios</h2>
        <div className="mt-4 space-y-4">
          {servicios.map((s) => <FormularioServicio key={s.id} s={s} />)}
          <details className="rounded-lg border border-dashed border-pizarra p-4">
            <summary className="cursor-pointer font-bold">Añadir un servicio</summary>
            <div className="mt-4"><FormularioServicio /></div>
          </details>
        </div>
      </section>

      {profesionales.map((p) => (
        <section key={p.id} aria-labelledby={`t-${p.id}`} className="mt-10">
          <h2 id={`t-${p.id}`} className="text-2xl font-bold">{p.nombre}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <FormularioProfesional p={p} servicios={servicios} />
            <div>
              <h3 className="mb-2 text-lg font-bold">Horario semanal</h3>
              <FormularioHorario p={p} />
            </div>
          </div>
        </section>
      ))}

      <section aria-labelledby="t-nuevo-pro" className="mt-10">
        <details className="rounded-lg border border-dashed border-pizarra p-4">
          <summary id="t-nuevo-pro" className="cursor-pointer font-bold">Añadir un profesional</summary>
          <div className="mt-4 max-w-xl"><FormularioProfesional servicios={servicios} /></div>
        </details>
      </section>
    </div>
  );
}
