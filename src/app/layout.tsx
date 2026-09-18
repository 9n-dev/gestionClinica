import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import { CLINICA, MODO_DEMO, URL_BASE } from "@/lib/clinica";
import "./globals.css";

// next/font aloja las fuentes en el propio dominio: no hay peticiones a Google (RGPD).
const titular = Bricolage_Grotesque({ variable: "--font-titular", subsets: ["latin"], display: "swap" });
const cuerpo = Atkinson_Hyperlegible_Next({ variable: "--font-cuerpo", subsets: ["latin"], display: "swap", adjustFontFallback: false });

export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE()),
  title: { default: `${CLINICA.nombre} · Clínica podológica en ${CLINICA.ciudad}`, template: `%s · ${CLINICA.nombre}` },
  description: `Clínica de podología en ${CLINICA.ciudad} (${CLINICA.provincia}): quiropodia, estudio de la pisada y plantillas a medida. Pide cita online en un minuto.`,
  openGraph: { locale: "es_ES", type: "website", siteName: CLINICA.nombre },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${titular.variable} ${cuerpo.variable}`}>
      <body className="font-sans antialiased">
        <a href="#contenido" className="btn btn-primario sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50">
          Saltar al contenido
        </a>
        {MODO_DEMO && <BannerDemo />}
        {children}
      </body>
    </html>
  );
}

function BannerDemo() {
  return (
    <p role="note" className="bg-ambar-claro px-4 py-1.5 text-center text-sm text-tinta">
      Esta es una demo: los datos son ficticios y se reinician cada día.
    </p>
  );
}
