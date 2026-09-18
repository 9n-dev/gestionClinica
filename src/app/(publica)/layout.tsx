import { BannerCookies } from "@/components/BannerCookies";
import { Cabecera } from "@/components/Cabecera";
import { Pie } from "@/components/Pie";
import { CLINICA, COORDENADAS, URL_BASE } from "@/lib/clinica";
import { horarioPublico } from "@/lib/horario";

// Servicios, equipo y huecos salen de la base de datos, que en la demo se reinicia a diario.
export const dynamic = "force-dynamic";

// Ficha de negocio local para buscadores. Datos propios de la clínica, nada que escriba un visitante.
const ficha = async () => ({
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
  openingHours: (await horarioPublico()).schema,
});

export default async function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cabecera />
      <main id="contenido">{children}</main>
      <Pie />
      <BannerCookies />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(await ficha()).replace(/</g, "\\u003c") }} />
    </>
  );
}
