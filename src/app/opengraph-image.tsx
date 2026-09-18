import { ImageResponse } from "next/og";
import { CLINICA } from "@/lib/clinica";

export const alt = `${CLINICA.nombre} · Clínica podológica en ${CLINICA.ciudad}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Mismo dibujo que icon.svg y colores de globals.css.
export default function Imagen() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 64, padding: 96, background: "#f4f7fa", color: "#15203b" }}>
        <svg width="240" height="240" viewBox="0 0 32 32">
          <ellipse cx="16" cy="16" rx="12" ry="15" fill="#dce6fb" />
          <ellipse cx="16.5" cy="17" rx="8" ry="10" fill="#2346c4" />
          <ellipse cx="17" cy="18" rx="3.5" ry="4.5" fill="#f0b33c" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, lineHeight: 1.05 }}>{CLINICA.nombre}</div>
          <div style={{ fontSize: 40, color: "#55617a" }}>{`Clínica podológica en ${CLINICA.ciudad}`}</div>
          <div style={{ fontSize: 34, color: "#2346c4", marginTop: 12 }}>Pide cita online en un minuto</div>
        </div>
      </div>
    ),
    size,
  );
}
