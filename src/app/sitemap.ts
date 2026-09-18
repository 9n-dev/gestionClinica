import type { MetadataRoute } from "next";
import { URL_BASE } from "@/lib/clinica";

const RUTAS = ["", "/servicios", "/equipo", "/contacto", "/reservar", "/legal/aviso-legal", "/legal/privacidad", "/legal/cookies"];

export default function sitemap(): MetadataRoute.Sitemap {
  return RUTAS.map((ruta) => ({ url: `${URL_BASE()}${ruta}` }));
}
