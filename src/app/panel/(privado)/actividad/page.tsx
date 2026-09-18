import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAuto } from "@/components/FormularioAuto";
import { requerirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatoFechaHora } from "@/lib/fechas";

export const metadata: Metadata = { title: "Actividad" };

const ACCIONES: Record<string, string> = { VER: "Abrió", CREAR: "Creó", EDITAR: "Cambió", BORRAR: "Borró", EXPORTAR: "Descargó los datos de", MOVER: "Movió", CANCELAR: "Canceló", ESTADO: "Marcó", ENTRAR: "Entró al panel" };
const ENTIDADES: Record<string, string> = { paciente: "Pacientes", cita: "Citas", usuario: "Usuarios", configuracion: "Configuración", bloqueo: "Bloqueos", sesion: "Entradas al panel" };
const NOMBRES: Record<string, string> = { paciente: "la ficha de un paciente", cita: "una cita", usuario: "un usuario", configuracion: "la configuración", bloqueo: "un bloqueo", sesion: "" };
const enlaceA = (entidad: string, id: string | null) => (id && entidad === "paciente" ? `/panel/pacientes/${id}` : id && entidad === "cita" ? `/panel/citas/${id}` : null);

export default async function Actividad({ searchParams }: { searchParams: Promise<{ entidad?: string; id?: string; usuario?: string }> }) {
  await requerirAdmin();
  const sp = await searchParams;
  const entidad = sp.entidad && sp.entidad in ENTIDADES ? sp.entidad : undefined;
  const [filas, usuarios] = await Promise.all([
    prisma.auditoria.findMany({
      where: { entidad, entidadId: sp.id || undefined, usuarioEmail: sp.usuario || undefined },
      orderBy: { creadoAt: "desc" },
      take: 200,
    }),
    prisma.auditoria.findMany({ distinct: ["usuarioEmail"], select: { usuarioEmail: true }, orderBy: { usuarioEmail: "asc" } }),
  ]);

  return (
    <>
      <h1 className="text-3xl font-bold">Actividad</h1>
      <p className="mt-2 max-w-[70ch] text-pizarra">
        Quién ha abierto o cambiado qué, y cuándo. Abrir una ficha o una cita también cuenta: son datos de salud. El registro no guarda datos de pacientes, solo a qué ficha se refiere.
      </p>

      <FormularioAuto action="/panel/actividad" className="mt-6 flex flex-wrap items-end gap-3">
        {sp.id && <input type="hidden" name="id" value={sp.id} />}
        <div>
          <label htmlFor="entidad" className="etiqueta">Qué</label>
          <select id="entidad" name="entidad" defaultValue={entidad ?? ""} className="campo">
            <option value="">Todo</option>
            {Object.entries(ENTIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="usuario" className="etiqueta">Quién</label>
          <select id="usuario" name="usuario" defaultValue={sp.usuario ?? ""} className="campo">
            <option value="">Cualquiera</option>
            {usuarios.map((u) => <option key={u.usuarioEmail}>{u.usuarioEmail}</option>)}
          </select>
        </div>
        <noscript><button className="btn btn-secundario">Filtrar</button></noscript>
        {sp.id && <p className="self-center">Solo lo de una ficha concreta. <Link href="/panel/actividad" className="enlace">Ver todo</Link></p>}
      </FormularioAuto>

      {filas.length ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-linea bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-linea text-pizarra">
              <tr>
                <th scope="col" className="p-3 font-bold">Cuándo</th>
                <th scope="col" className="p-3 font-bold">Quién</th>
                <th scope="col" className="p-3 font-bold">Qué hizo</th>
                <th scope="col" className="p-3 font-bold">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const href = enlaceA(f.entidad, f.entidadId);
                return (
                  <tr key={f.id} className="border-b border-linea last:border-0">
                    <td className="whitespace-nowrap p-3 tabular-nums">{formatoFechaHora(f.creadoAt)}</td>
                    <td className="break-all p-3">{f.usuarioEmail}</td>
                    <td className="p-3">{ACCIONES[f.accion] ?? f.accion} {href ? <Link href={href} className="enlace">{NOMBRES[f.entidad]}</Link> : NOMBRES[f.entidad]}</td>
                    <td className="p-3 text-pizarra">{f.detalle}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 rounded-lg bg-ambar-claro p-5">No hay nada apuntado con ese filtro.</p>
      )}
      {filas.length === 200 && <p className="mt-3 text-pizarra">Se muestran los 200 apuntes más recientes. Filtra para ver otros.</p>}
    </>
  );
}
