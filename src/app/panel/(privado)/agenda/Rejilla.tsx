"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { minutosAHora } from "@/lib/fechas";
import { moverArrastrando } from "../../acciones";

// Todo lo que recibe es serializable: minutos desde medianoche y textos ya formateados.
export type Columna = { dia: string; diaTexto: string; esHoy: boolean; pro: { id: string; slug: string; nombre: string; iniciales: string } };
export type Tramo = { col: number; desde: number; hasta: number };
export type BloqueoRejilla = { id: string; col: number; desde: number; hasta: number; motivo: string };
export type CitaRejilla = { id: string; col: number; desde: number; hasta: number; hora: string; nombre: string; servicio: string; estado: string; tono: string; inicioIso: string };

export const DESDE = 9 * 60;
export const HASTA = 20 * 60;
const FILA = 15;
const FILAS = (HASTA - DESDE) / FILA;
const CABECERAS = 2;
const fila = (min: number) => Math.round((Math.min(Math.max(min, DESDE), HASTA) - DESDE) / FILA) + 1 + CABECERAS;

type Props = { columnas: Columna[]; nPros: number; vista: "dia" | "semana"; tramos: Tramo[]; bloqueos: BloqueoRejilla[]; citas: CitaRejilla[]; filtro: string };

export function Rejilla({ columnas, nPros, vista, tramos, bloqueos, citas, filtro }: Props) {
  const urlDia = (dia: string) => `/panel/agenda?vista=dia&fecha=${dia}&profesional=${filtro}`;
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [destino, setDestino] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const dias = columnas.filter((_, i) => i % nPros === 0);
  const claveCelda = (col: number, min: number) => `${col}:${min}`;

  function soltar(col: number, min: number) {
    const cita = citas.find((c) => c.id === arrastrando);
    setDestino(null);
    setArrastrando(null);
    if (!cita) return;
    const c = columnas[col];
    // El instante destino se calcula desde el inicio de la cita en UTC: mismo día → solo cambian los minutos.
    const inicio = new Date(new Date(cita.inicioIso).getTime() + (min - cita.desde) * 60_000 + diasEntre(columnas[cita.col].dia, c.dia) * 86_400_000);
    setMensaje("Moviendo la cita…");
    empezar(async () => {
      const r = await moverArrastrando(cita.id, c.pro.slug, inicio.toISOString());
      setMensaje(r.ok ? `Cita de ${cita.nombre} movida a las ${minutosAHora(min)}, ${c.pro.nombre}.` : `No se ha movido: ${r.error}`);
      router.refresh();
    });
  }

  return (
    <>
      <p role="status" aria-live="polite" className={`min-h-6 font-bold ${mensaje?.startsWith("No") ? "text-error" : "text-exito"}`}>{mensaje}</p>
      <div className={`relative overflow-x-auto rounded-lg border border-linea bg-[#e9eef5] ${pendiente ? "opacity-70" : ""}`}>
        <div
          className="grid text-sm"
          style={{
            gridTemplateColumns: `3.5rem repeat(${columnas.length}, minmax(${vista === "dia" ? "14rem" : nPros === 1 ? "9rem" : "6.5rem"}, 1fr))`,
            gridTemplateRows: `auto auto repeat(${FILAS}, 1.5rem)`,
          }}
        >
          {/* Cabeceras: día y profesional */}
          {dias.map((c, i) => (
            <div key={c.dia} style={{ gridColumn: `${i * nPros + 2} / span ${nPros}`, gridRow: 1 }} className={`border-l border-linea bg-white px-2 pt-2 text-center font-bold first-letter:uppercase ${c.esHoy ? "text-cobalto" : ""}`}>
              {vista === "semana" ? <Link href={urlDia(c.dia)} className="underline-offset-4 hover:underline">{c.diaTexto}</Link> : c.diaTexto}
              {c.esHoy && <span className="sr-only"> (hoy)</span>}
            </div>
          ))}
          {columnas.map((c, i) => (
            <div key={i} style={{ gridColumn: i + 2, gridRow: 2 }} className="border-b border-l border-linea bg-white px-2 pb-2 text-center text-pizarra">
              {vista === "dia" || nPros === 1 ? c.pro.nombre : <abbr title={c.pro.nombre} className="no-underline">{c.pro.iniciales}</abbr>}
            </div>
          ))}

          {/* Horas */}
          {Array.from({ length: (HASTA - DESDE) / 60 }, (_, h) => (
            <div key={h} style={{ gridColumn: 1, gridRow: `${fila(DESDE + h * 60)} / span 4` }} className="border-t border-linea pr-2 text-right text-pizarra tabular-nums">
              {minutosAHora(DESDE + h * 60)}
            </div>
          ))}

          {/* Horario laboral en blanco (enlaza a "nueva cita"); fuera de horario queda el fondo gris */}
          {tramos.map((t, i) => (
            <Link
              key={i}
              href={`/panel/citas/nueva?profesional=${columnas[t.col].pro.slug}&dia=${columnas[t.col].dia}&hora=${minutosAHora(t.desde).padStart(5, "0")}`}
              aria-label={`Nueva cita con ${columnas[t.col].pro.nombre}, ${columnas[t.col].diaTexto}, ${minutosAHora(t.desde)} a ${minutosAHora(t.hasta)}`}
              style={{ gridColumn: t.col + 2, gridRow: `${fila(t.desde)} / ${fila(t.hasta)}` }}
              className="border-l border-linea bg-white bg-[linear-gradient(to_bottom,var(--color-linea)_1px,transparent_1px)] bg-[length:100%_6rem] hover:bg-cielo/60"
            />
          ))}

          {/* Celdas de destino: solo existen mientras se arrastra una cita */}
          {arrastrando &&
            columnas.flatMap((c, col) =>
              Array.from({ length: FILAS }, (_, f) => {
                const min = DESDE + f * FILA;
                const clave = claveCelda(col, min);
                return (
                  <div
                    key={clave}
                    style={{ gridColumn: col + 2, gridRow: fila(min) }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (destino !== clave) setDestino(clave); }}
                    onDragLeave={() => destino === clave && setDestino(null)}
                    onDrop={(e) => { e.preventDefault(); soltar(col, min); }}
                    className={`z-30 ${destino === clave ? "bg-cobalto/30 outline-2 outline-cobalto" : ""}`}
                  />
                );
              }),
            )}

          {/* Bloqueos */}
          {bloqueos.map((b) => (
            <div key={`${b.col}-${b.id}`} style={{ gridColumn: b.col + 2, gridRow: `${fila(b.desde)} / ${fila(b.hasta)}` }} className="z-10 mx-0.5 overflow-hidden rounded border border-ambar bg-[repeating-linear-gradient(135deg,var(--color-ambar-claro)_0_8px,#fff_8px_16px)] px-1.5 py-0.5 leading-tight">
              <span className="font-bold">Bloqueado</span> {b.motivo}
            </div>
          ))}

          {/* Citas: las confirmadas se pueden arrastrar */}
          {citas.map((c) => {
            const movible = c.estado === "CONFIRMADA";
            return (
              <Link
                key={c.id}
                href={`/panel/citas/${c.id}`}
                draggable={movible}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", c.id); setArrastrando(c.id); setMensaje(null); }}
                onDragEnd={() => { setArrastrando(null); setDestino(null); }}
                style={{ gridColumn: c.col + 2, gridRow: `${fila(c.desde)} / ${fila(c.hasta)}` }}
                className={`z-20 mx-0.5 overflow-hidden rounded border-l-4 px-1.5 py-0.5 leading-tight text-tinta no-underline hover:brightness-95 ${c.tono} ${movible ? "cursor-grab active:cursor-grabbing" : ""} ${arrastrando === c.id ? "opacity-40" : ""} ${arrastrando ? "pointer-events-none" : ""}`}
                title={movible ? "Arrastra para cambiar la hora o el profesional" : undefined}
              >
                <span className="block truncate"><span className="font-bold tabular-nums">{c.hora}</span> {c.nombre}</span>
                <span className="block truncate text-pizarra">{c.servicio}{c.estado === "ATENDIDA" && ", atendida"}{c.estado === "NO_PRESENTADA" && ", no se presentó"}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
