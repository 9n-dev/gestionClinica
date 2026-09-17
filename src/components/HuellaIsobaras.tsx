// Huella dibujada como un mapa de presiones plantares (baropodometría): cada zona de apoyo
// son isobaras anidadas que van del cobalto (poca carga) al ámbar (pico de carga).
type Zona = { cx: number; cy: number; rx: number; ry: number; rot?: number; px?: number; py?: number; niveles: number };

const ZONAS: Zona[] = [
  { cx: 196, cy: 452, rx: 64, ry: 80, px: 4, py: 10, niveles: 5 }, // talón
  { cx: 150, cy: 330, rx: 40, ry: 86, rot: 8, px: -4, py: 0, niveles: 2 }, // borde externo
  { cx: 204, cy: 212, rx: 98, ry: 70, rot: -12, px: 34, py: -4, niveles: 5 }, // metatarsos
  { cx: 276, cy: 96, rx: 31, ry: 40, rot: 8, py: 4, niveles: 4 }, // dedo gordo
  { cx: 220, cy: 70, rx: 20, ry: 26, niveles: 3 },
  { cx: 176, cy: 78, rx: 18, ry: 23, rot: -8, niveles: 3 },
  { cx: 138, cy: 100, rx: 16, ry: 20, rot: -16, niveles: 2 },
  { cx: 106, cy: 132, rx: 14, ry: 17, rot: -24, niveles: 2 },
];
const COLORES = ["#dce6fb", "#a9bff5", "#6484e6", "#2346c4", "#f0b33c"];

export function HuellaIsobaras({ className }: { className?: string }) {
  return (
    <svg viewBox="40 20 320 530" className={className} role="img" aria-label="Huella de un pie representada como mapa de presiones, con más carga en el talón y los metatarsos">
      {COLORES.map((color, nivel) => (
        <g key={color} className="isobara" style={{ animationDelay: `${150 + nivel * 160}ms` }}>
          {ZONAS.filter((z) => nivel < z.niveles).map((z, i) => {
            const t = nivel / 5;
            return (
              <ellipse
                key={i}
                cx={z.cx + (z.px ?? 0) * t}
                cy={z.cy + (z.py ?? 0) * t}
                rx={z.rx * (1 - 0.92 * t)}
                ry={z.ry * (1 - 0.92 * t)}
                transform={`rotate(${z.rot ?? 0} ${z.cx} ${z.cy})`}
                fill={color}
                stroke="#f4f7fa"
                strokeWidth={nivel ? 1.5 : 0}
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
}
