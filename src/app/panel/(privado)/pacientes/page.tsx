import type { Metadata } from "next";
import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatoFechaHora } from "@/lib/fechas";
import { normalizarNombre } from "@/lib/pacientes";
import { FormularioNuevoPaciente } from "./nuevo";

export const metadata: Metadata = { title: "Pacientes" };

const MAX = 50;

export default async function Pacientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { user } = await requerirSesion();
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const nombre = normalizarNombre(q);
  const cifras = q.replace(/\D/g, "");
  const pacientes = await prisma.paciente.findMany({
    where: q ? { eliminadoAt: null, OR: [...(nombre ? [{ nombreNorm: { contains: nombre } }] : []), ...(cifras ? [{ telefono: { contains: cifras } }] : [])] } : { eliminadoAt: null },
    orderBy: { nombreNorm: "asc" },
    take: MAX + 1,
    // ponytail: trae todas las citas de los pacientes listados para contarlas aquí; con historiales de cientos de citas, pasar a groupBy.
    include: { citas: { select: { estado: true, inicio: true } } },
  });
  const ahora = new Date();

  return (
    <>
      <h1 className="text-3xl font-bold">Pacientes</h1>
      <p className="mt-2 max-w-[70ch] text-pizarra">Se crean solos con la primera cita, por la web o desde el panel; también se pueden dar de alta a mano o importar. Mismo teléfono y mismo nombre es el mismo paciente.</p>

      <form method="get" role="search" className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1 sm:max-w-md">
          <label htmlFor="q" className="etiqueta">Buscar por nombre o teléfono</label>
          <input id="q" name="q" type="search" defaultValue={q} className="campo" />
        </div>
        <button className="btn btn-secundario">Buscar</button>
        {q && <Link href="/panel/pacientes" className="enlace self-center">Ver todos</Link>}
        {user.rol === "ADMIN" && <Link href="/panel/pacientes/importar" className="btn btn-secundario sm:ml-auto">Importar pacientes</Link>}
      </form>

      <details className="mt-4 rounded-lg border border-dashed border-pizarra p-4">
        <summary className="cursor-pointer font-bold">Nuevo paciente sin cita</summary>
        <div className="mt-4 max-w-2xl"><FormularioNuevoPaciente /></div>
      </details>

      {pacientes.length ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-linea bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-linea text-pizarra">
              <tr>
                <th scope="col" className="p-3 font-bold">Paciente</th>
                <th scope="col" className="p-3 font-bold">Teléfono</th>
                <th scope="col" className="p-3 font-bold">Visitas</th>
                <th scope="col" className="p-3 font-bold">Faltas</th>
                <th scope="col" className="p-3 font-bold">Próxima cita</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.slice(0, MAX).map((p) => {
                const faltas = p.citas.filter((c) => c.estado === "NO_PRESENTADA").length;
                const proxima = p.citas.filter((c) => c.estado === "CONFIRMADA" && c.inicio > ahora).sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0];
                return (
                  <tr key={p.id} className="border-b border-linea last:border-0">
                    <th scope="row" className="p-3"><Link href={`/panel/pacientes/${p.id}`} className="enlace font-bold">{p.nombre}</Link></th>
                    <td className="p-3 tabular-nums">{p.telefono}</td>
                    <td className="p-3 tabular-nums">{p.citas.filter((c) => c.estado === "ATENDIDA").length}</td>
                    <td className="p-3 tabular-nums">{faltas ? <span className="rounded bg-ambar-claro px-2 py-0.5 font-bold">{faltas}</span> : "0"}</td>
                    <td className="p-3">{proxima ? formatoFechaHora(proxima.inicio) : <span className="text-pizarra">Ninguna</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 rounded-lg bg-ambar-claro p-5">{q ? `Ningún paciente coincide con «${q}».` : "Todavía no hay pacientes."}</p>
      )}
      {pacientes.length > MAX && <p className="mt-3 text-pizarra">Se muestran los primeros {MAX}. Afina la búsqueda para ver el resto.</p>}
    </>
  );
}
