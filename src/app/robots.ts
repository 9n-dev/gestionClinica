import type { MetadataRoute } from "next";
import { URL_BASE } from "@/lib/clinica";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/cita", "/api"] }, sitemap: `${URL_BASE()}/sitemap.xml` };
}
