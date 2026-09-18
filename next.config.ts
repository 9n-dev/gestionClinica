import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las respuestas.
// La CSP es la que se puede tener sin nonces: Next inyecta scripts en línea y la app usa atributos style, así que
// script-src y style-src llevan 'unsafe-inline'. No frena un XSS que inyecte un <script> en línea (de eso se ocupa React,
// que escapa todo lo que pinta), pero sí cierra lo demás: scripts, marcos y envíos de formularios a otros orígenes,
// <base> y <object>, y que otra web meta el panel en un iframe. El único origen ajeno es el mapa de Google de /contacto.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`, // el modo desarrollo de Next usa eval
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self' https://www.google.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ],
    },
  ],
};

export default nextConfig;
