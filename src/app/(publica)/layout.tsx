import { BannerCookies } from "@/components/BannerCookies";
import { Cabecera } from "@/components/Cabecera";
import { Pie } from "@/components/Pie";
import { CLINICA, COORDENADAS, HORARIO_SCHEMA, URL_BASE } from "@/lib/clinica";

// Servicios, equipo y huecos salen de la base de datos, que en la demo se reinicia a diario.
export const dynamic = "force-dynamic";

// Ficha de negocio local para buscadores. Solo constantes propias, nada que venga del usuario.
const FICHA = {
  "@context": "https://schema.org",
  "@type": "Podiatrist",
  name: CLINICA.nombre,
  url: URL_BASE(),
  image: `${URL_BASE()}/opengraph-image`,
  telephone: CLINICA.telefonoHref.replace("tel:", ""),
  email: CLINICA.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: CLINICA.direccion,
    postalCode: CLINICA.cp,
    addressLocality: CLINICA.ciudad,
    addressRegion: CLINICA.provincia,
    addressCountry: "ES",
  },
  geo: { "@type": "GeoCoordinates", ...COORDENADAS },
  openingHours: HORARIO_SCHEMA,
};

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cabecera />
      <main id="contenido">{children}</main>
      <Pie />
      <BannerCookies />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FICHA) }} />
    </>
  );
}
