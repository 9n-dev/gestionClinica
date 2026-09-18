"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { comprobarImportacion, confirmarImportacion, type EstadoImportacion } from "../../../acciones";

const MAX_BYTES = 1_000_000; // el límite de cuerpo de las acciones de servidor de Next

export function FormularioImportar() {
  const [comprobacion, comprobar, comprobando] = useActionState<EstadoImportacion, FormData>(comprobarImportacion, {});
  const [resultado, confirmar, importando] = useActionState<EstadoImportacion, FormData>(confirmarImportacion, {});
  const [grande, setGrande] = useState(false);
  const c = comprobacion.comprobado;

  if (resultado.hecho)
    return (
      <div role="status" className="rounded-lg bg-pino-claro p-5">
        <p className="text-xl font-bold text-exito">{resultado.hecho.creados === 1 ? "1 paciente importado" : `${resultado.hecho.creados} pacientes importados`}</p>
        {resultado.hecho.yaExistian > 0 && <p className="mt-1">{resultado.hecho.yaExistian === 1 ? "1 ya existía" : `${resultado.hecho.yaExistian} ya existían`} (mismo teléfono y mismo nombre) y no se han tocado.</p>}
        <p className="mt-3"><Link href="/panel/pacientes" className="enlace">Ver los pacientes</Link></p>
      </div>
    );

  return (
    <>
      <form action={comprobar} className="rounded-lg border border-linea bg-white p-6">
        <label htmlFor="fichero" className="etiqueta">Fichero CSV</label>
        <input id="fichero" name="fichero" type="file" accept=".csv,text/csv,text/plain" required className="campo" onChange={(e) => setGrande((e.target.files?.[0]?.size ?? 0) > MAX_BYTES)} />
        {grande && <p role="alert" className="mt-2 font-bold text-error">Ese fichero pasa de 1 MB. Divídelo en varios y súbelos uno a uno.</p>}
        {comprobacion.error && <p role="alert" className="mt-2 font-bold text-error">{comprobacion.error}</p>}
        <button className="btn btn-secundario mt-4" disabled={comprobando || grande}>{comprobando ? "Comprobando…" : "Comprobar el fichero"}</button>
      </form>

      {c && (
        <section aria-labelledby="t-resultado" className="mt-6 rounded-lg border border-linea bg-white p-6">
          <h2 id="t-resultado" className="text-xl font-bold">Resultado de la comprobación</h2>
          <ul className="mt-3 space-y-1">
            <li><strong>{c.validas.length}</strong> {c.validas.length === 1 ? "paciente listo" : "pacientes listos"} para importar</li>
            {c.repetidas > 0 && <li><strong>{c.repetidas}</strong> {c.repetidas === 1 ? "fila repetida" : "filas repetidas"} dentro del fichero (se importa una sola vez)</li>}
            {c.errores.length > 0 && <li className="text-error"><strong>{c.errores.length}</strong> {c.errores.length === 1 ? "fila con problemas" : "filas con problemas"}, que no se importarán:</li>}
          </ul>
          {c.errores.length > 0 && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded border border-linea">
              <table className="w-full text-left">
                <thead className="text-pizarra"><tr><th scope="col" className="p-2 font-normal">Línea</th><th scope="col" className="p-2 font-normal">Fila</th><th scope="col" className="p-2 font-normal">Problema</th></tr></thead>
                <tbody>
                  {c.errores.map((e) => <tr key={e.linea} className="border-t border-linea"><td className="p-2 tabular-nums">{e.linea}</td><td className="p-2">{e.texto}</td><td className="p-2">{e.motivo}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
          {c.validas.length > 0 && (
            <form action={confirmar} className="mt-5">
              <input type="hidden" name="filas" value={JSON.stringify(c.validas)} />
              <p className="mb-3 text-pizarra">Los que ya existan en el panel (mismo teléfono y mismo nombre) se dejan como están. Los primeros: {c.validas.slice(0, 3).map((p) => p.nombre).join(", ")}{c.validas.length > 3 && "…"}</p>
              {resultado.error && <p role="alert" className="mb-3 font-bold text-error">{resultado.error}</p>}
              <button className="btn btn-primario" disabled={importando}>{importando ? "Importando…" : c.validas.length === 1 ? "Importar 1 paciente" : `Importar ${c.validas.length} pacientes`}</button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
