export default function LayoutLegal({ children }: { children: React.ReactNode }) {
  return (
    <div className="contenedor py-12">
      <article className="prosa">{children}</article>
      <p className="mt-10 max-w-[68ch] rounded-lg bg-ambar-claro p-4 text-base">
        Texto de demostración para una clínica ficticia. Sirve de punto de partida, pero cada clínica debe revisarlo con su asesoría o su delegado de protección de datos.
      </p>
    </div>
  );
}
