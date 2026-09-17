import { BannerCookies } from "@/components/BannerCookies";
import { Cabecera } from "@/components/Cabecera";
import { Pie } from "@/components/Pie";

// Servicios, equipo y huecos salen de la base de datos, que en la demo se reinicia a diario.
export const dynamic = "force-dynamic";

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cabecera />
      <main id="contenido">{children}</main>
      <Pie />
      <BannerCookies />
    </>
  );
}
