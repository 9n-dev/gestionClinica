import type { Metadata } from "next";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { MAX_FILAS } from "@/lib/importar";
import { FormularioImportar } from "./formulario";

export const metadata: Metadata = { title: "Importar pacientes" };

export default async function ImportarPacientes() {
  await requerirAdmin();
  return (
    <div className="max-w-3xl">
      <p><Link href="/panel/pacientes" className="enlace">Volver a pacientes</Link></p>
      <h1 className="mt-4 text-3xl font-bold">Importar pacientes</h1>
      <p className="mt-2 text-pizarra">Para traer de una vez la cartera que ya tiene la clínica. Primero se comprueba el fichero y se enseña qué entraría; no se guarda nada hasta que lo confirmes.</p>

      <ol className="mt-6 list-decimal space-y-2 pl-6">
        <li>En Excel, <strong>Archivo → Guardar como → CSV</strong> (vale «CSV» y «CSV UTF-8»; tildes y eñes se leen bien en los dos).</li>
        <li>La primera fila son los nombres de las columnas. Hacen falta <strong>Nombre</strong> y <strong>Teléfono</strong>; se reconocen también Apellidos, Email y Notas, con los nombres habituales (Móvil, Correo, Observaciones…). El resto de columnas se ignoran.</li>
        <li>Máximo {MAX_FILAS.toLocaleString("es-ES")} filas y 1 MB por fichero. <a href="/plantilla-pacientes.csv" download className="enlace">Descargar una plantilla de ejemplo</a>.</li>
      </ol>
      <p className="mt-4 rounded-lg bg-ambar-claro p-4"><strong>No importes notas clínicas.</strong> Las notas de la ficha son para preferencias de horario o a quién llamar. Si la columna de observaciones de tu programa anterior lleva diagnósticos o tratamientos, bórrala del fichero antes de subirlo.</p>

      <div className="mt-6"><FormularioImportar /></div>
    </div>
  );
}
