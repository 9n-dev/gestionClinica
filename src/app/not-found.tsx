import Link from "next/link";

export default function NoEncontrada() {
  return (
    <main id="contenido" className="contenedor py-24">
      <h1 className="text-5xl font-extrabold">Esta página no existe</h1>
      <p className="mt-4 max-w-[60ch] text-xl text-pizarra">Puede que el enlace esté mal escrito o que la página se haya movido. Si buscabas tu cita, abre el enlace del email de confirmación.</p>
      <p className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primario">Ir al inicio</Link>
        <Link href="/reservar" className="btn btn-secundario">Pedir cita</Link>
      </p>
    </main>
  );
}
