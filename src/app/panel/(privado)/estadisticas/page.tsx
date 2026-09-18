import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAuto } from "@/components/FormularioAuto";
import { requerirAdmin } from "@/lib/auth";
import { esMes, estadisticas, sumarMeses, tasaAusencias, type Mes } from "@/lib/estadisticas";
import { formatoDia, formatoPrecio, hoy } from "@/lib/fechas";

export const metadata: Metadata = { title: "Estadísticas" };

const nombreMes = (mes: Mes, o: Intl.DateTimeFormatOptions = { month: "long" }) => formatoDia(`${mes}-01`, o);
const entero = (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
const pct = (n: number | null) => (n === null ? "—" : `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(n)} %`);

/** Tope redondo para el eje: 1, 2 o 5 por una potencia de 10. */
function topeRedondo(max: number) {
  if (max <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 5, 10].map((k) => k * base).find((t) => t >= max)!;
}

// Un solo tono: el mes elegido en el cobalto del sitio y el resto en gris. Texto siempre en tinta, nunca del color del dato.
const ACENTO = "#2346c4";
const GRIS = "#7f8ba1";

/** Variación respecto al mes anterior: flecha, texto y color (el color nunca va solo). `subirEsBueno` decide cuál es el verde. */
function Delta({ ahora, antes, subirEsBueno, unidad, mesAnterior }: { ahora: number | null; antes: number | null; subirEsBueno: boolean; unidad: "%" | "puntos"; mesAnterior: string }) {
  if (ahora === null || antes === null || (unidad === "%" && antes === 0)) return <p className="mt-1 text-base text-pizarra">Sin datos de {mesAnterior} para comparar</p>;
  const d = unidad === "%" ? (100 * (ahora - antes)) / antes : ahora - antes;
  if (Math.abs(d) < 0.05) return <p className="mt-1 text-base text-pizarra">Igual que en {mesAnterior}</p>;
  const bueno = d > 0 === subirEsBueno;
  const cifra = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(Math.abs(d));
  return (
    <p className={`mt-1 text-base font-bold ${bueno ? "text-exito" : "text-error"}`}>
      <span aria-hidden="true">{d > 0 ? "▲" : "▼"}</span> {d > 0 ? "Sube" : "Baja"} {cifra} {unidad === "%" ? "%" : cifra === "1" ? "punto" : "puntos"}
      <span className="font-normal text-pizarra"> respecto a {mesAnterior}</span>
    </p>
  );
}

function Medidor({ valor, etiqueta }: { valor: number | null; etiqueta: string }) {
  return (
    <div role="meter" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(valor ?? 0)} aria-valuetext={pct(valor)} className="h-2.5 w-full overflow-hidden rounded-full bg-cielo">
      <div className="h-full rounded-full" style={{ width: `${valor ?? 0}%`, background: ACENTO }} />
    </div>
  );
}

const tarjeta = "rounded-lg border border-linea bg-white p-5";
const burbuja = "pointer-events-none absolute z-10 hidden w-max max-w-56 rounded-md bg-tinta px-3 py-2 text-left text-sm font-normal text-white group-hover:block group-focus-visible:block";

export default async function Estadisticas({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requerirAdmin();
  const sp = await searchParams;
  const actual = hoy().slice(0, 7);
  const mes = esMes(sp.mes) && sp.mes <= actual ? sp.mes : actual;
  const e = await estadisticas(mes);
  const mesAnterior = nombreMes(sumarMeses(mes, -1));
  const tope = topeRedondo(Math.max(...e.tendencia.map((m) => m.ingresosCent)) / 100);
  const mejor = Math.max(...e.tendencia.map((m) => m.ingresosCent));
  const maxCitas = Math.max(1, ...e.porServicio.map((s) => s.citas));
  const sinDatos = !e.tendencia.some((m) => m.atendidas + m.noPresentadas + m.canceladas + m.pendientes);

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold">Estadísticas</h1>
      <p className="mt-2 max-w-[70ch] text-pizarra">Ingresos de las citas atendidas, con el precio que tenía el servicio al reservar. La ocupación compara el tiempo citado con el horario de cada profesional, descontados los bloqueos.</p>

      {/* Un único filtro, encima de todo lo que gobierna */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <FormularioAuto action="/panel/estadisticas">
          <label htmlFor="mes" className="etiqueta">Mes</label>
          <input id="mes" name="mes" type="month" defaultValue={mes} max={actual} className="campo" />
          <noscript><button className="btn btn-secundario ml-2">Ver</button></noscript>
        </FormularioAuto>
        <Link href={`/panel/estadisticas?mes=${sumarMeses(mes, -1)}`} className="btn btn-secundario">Mes anterior</Link>
        {mes < actual && <Link href={`/panel/estadisticas?mes=${sumarMeses(mes, 1)}`} className="btn btn-secundario">Mes siguiente</Link>}
      </div>

      {sinDatos ? (
        <p className="mt-8 rounded-lg bg-ambar-claro p-5">No hay ninguna cita en {nombreMes(mes, { month: "long", year: "numeric" })} ni en los cinco meses anteriores.</p>
      ) : (
        <>
          <h2 className="mt-8 text-2xl font-bold first-letter:uppercase">{nombreMes(mes, { month: "long", year: "numeric" })}{mes === actual && <span className="text-lg font-normal text-pizarra"> · mes en curso</span>}</h2>

          {/* Cifras clave. Una sola es la protagonista: los ingresos. */}
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className={`${tarjeta} flex flex-col-reverse justify-end`}>
              <Delta ahora={e.total.ingresosCent} antes={e.anterior.ingresosCent} subirEsBueno unidad="%" mesAnterior={mesAnterior} />
              <dd className="font-sans text-5xl font-semibold leading-tight">{formatoPrecio(e.total.ingresosCent)}</dd>
              <dt className="text-pizarra">Ingresos</dt>
            </div>
            <div className={`${tarjeta} flex flex-col-reverse justify-end`}>
              <Delta ahora={e.total.atendidas} antes={e.anterior.atendidas} subirEsBueno unidad="%" mesAnterior={mesAnterior} />
              <dd className="font-sans text-3xl font-semibold">{entero(e.total.atendidas)}</dd>
              <dt className="text-pizarra">Citas atendidas</dt>
            </div>
            <div className={`${tarjeta} flex flex-col-reverse justify-end`}>
              <div className="mt-3"><Medidor valor={e.ocupacion} etiqueta="Ocupación de la agenda" /></div>
              <dd className="font-sans text-3xl font-semibold">{pct(e.ocupacion)}</dd>
              <dt className="text-pizarra">Ocupación de la agenda</dt>
            </div>
            <div className={`${tarjeta} flex flex-col-reverse justify-end`}>
              <p className="mt-1 text-base text-pizarra">{entero(e.total.noPresentadas)} de {entero(e.total.atendidas + e.total.noPresentadas)} citas. Canceladas a tiempo: {entero(e.total.canceladas)}</p>
              <Delta ahora={tasaAusencias(e.total)} antes={tasaAusencias(e.anterior)} subirEsBueno={false} unidad="puntos" mesAnterior={mesAnterior} />
              <dd className="font-sans text-3xl font-semibold">{pct(tasaAusencias(e.total))}</dd>
              <dt className="text-pizarra">No se presentaron</dt>
            </div>
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Tendencia: columnas de una sola serie; el mes elegido destaca, el resto en gris */}
            <section aria-labelledby="t-tendencia" className={tarjeta}>
              <h3 id="t-tendencia" className="text-xl font-bold">Ingresos de los últimos seis meses</h3>
              <div className="mt-6 grid grid-cols-[auto_1fr] gap-x-3">
                <div aria-hidden="true" className="flex h-48 flex-col justify-between text-right text-sm leading-none text-pizarra tabular-nums">
                  {[tope, tope / 2, 0].map((t) => <span key={t}>{entero(t)} €</span>)}
                </div>
                <div className="relative h-48">
                  {[0, 50, 100].map((y) => <div key={y} className="absolute inset-x-0 border-t border-linea" style={{ top: `${y}%` }} />)}
                  <div className="absolute inset-0 flex items-end justify-around">
                    {e.tendencia.map((m, i) => {
                      const elegido = m.mes === mes;
                      const etiquetar = elegido || (m.ingresosCent === mejor && mejor > 0); // solo el mes elegido y el mejor llevan cifra
                      return (
                        <div key={m.mes} tabIndex={0} role="img" aria-label={`${nombreMes(m.mes, { month: "long", year: "numeric" })}: ${formatoPrecio(m.ingresosCent)}, ${m.atendidas} atendidas, ${m.noPresentadas} ausencias`} className="group relative flex h-full w-12 flex-col items-center justify-end outline-offset-2">
                          {etiquetar && <span className="mb-1 whitespace-nowrap text-sm font-bold text-tinta">{formatoPrecio(m.ingresosCent)}</span>}
                          <div className="w-6 rounded-t" style={{ height: `${(m.ingresosCent / 100 / tope) * 100}%`, minHeight: m.ingresosCent ? 2 : 0, background: elegido ? ACENTO : GRIS }} />
                          <span className={`${burbuja} bottom-full mb-1 ${i < e.tendencia.length / 2 ? "left-0" : "right-0"}`}>
                            <strong className="block first-letter:uppercase">{nombreMes(m.mes, { month: "long", year: "numeric" })}</strong>
                            {formatoPrecio(m.ingresosCent)} · {entero(m.atendidas)} atendidas · {entero(m.noPresentadas)} ausencias
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <span />
                <div aria-hidden="true" className="mt-2 flex justify-around text-sm text-pizarra">
                  {e.tendencia.map((m) => <span key={m.mes} className={`w-12 text-center ${m.mes === mes ? "font-bold text-tinta" : ""}`}>{nombreMes(m.mes, { month: "short" }).replace(".", "")}</span>)}
                </div>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-base font-bold">Ver como tabla</summary>
                <table className="mt-2 w-full text-left tabular-nums">
                  <thead className="text-pizarra"><tr><th scope="col" className="py-1 font-normal">Mes</th><th scope="col" className="py-1 text-right font-normal">Ingresos</th><th scope="col" className="py-1 text-right font-normal">Atendidas</th><th scope="col" className="py-1 text-right font-normal">Ausencias</th></tr></thead>
                  <tbody>
                    {e.tendencia.map((m) => (
                      <tr key={m.mes} className="border-t border-linea">
                        <th scope="row" className="py-1 font-normal first-letter:uppercase">{nombreMes(m.mes, { month: "long", year: "numeric" })}</th>
                        <td className="py-1 text-right">{formatoPrecio(m.ingresosCent)}</td><td className="py-1 text-right">{entero(m.atendidas)}</td><td className="py-1 text-right">{entero(m.noPresentadas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>

            {/* Por servicio: barras de una serie, mismo color todas (las categorías no tienen orden), cifra en la punta */}
            <section aria-labelledby="t-servicios" className={tarjeta}>
              <h3 id="t-servicios" className="text-xl font-bold">Citas por servicio</h3>
              <p className="text-base text-pizarra">Sin contar las canceladas.</p>
              {e.porServicio.length ? (
                <ul className="mt-4 space-y-3">
                  {e.porServicio.map((s) => (
                    <li key={s.id} tabIndex={0} aria-label={`${s.nombre}: ${s.citas} citas, ${s.atendidas} atendidas, ${s.pendientes} pendientes, ${s.noPresentadas} ausencias, ${formatoPrecio(s.ingresosCent)}`} className="group relative outline-offset-2">
                      <span className="block truncate">{s.nombre}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-4 rounded-r" style={{ width: `calc(${(s.citas / maxCitas) * 100}% - 3rem)`, minWidth: s.citas ? 2 : 0, background: ACENTO }} />
                        <span className="font-bold">{entero(s.citas)}</span>
                      </span>
                      <span className={`${burbuja} left-0 top-full mt-1`}>{entero(s.atendidas)} atendidas · {entero(s.pendientes)} pendientes · {entero(s.noPresentadas)} ausencias · {formatoPrecio(s.ingresosCent)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-pizarra">Ninguna cita este mes.</p>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer text-base font-bold">Ver como tabla</summary>
                <table className="mt-2 w-full text-left tabular-nums">
                  <thead className="text-pizarra"><tr><th scope="col" className="py-1 font-normal">Servicio</th><th scope="col" className="py-1 text-right font-normal">Citas</th><th scope="col" className="py-1 text-right font-normal">Atendidas</th><th scope="col" className="py-1 text-right font-normal">Ingresos</th></tr></thead>
                  <tbody>
                    {e.porServicio.map((s) => (
                      <tr key={s.id} className="border-t border-linea"><th scope="row" className="py-1 font-normal">{s.nombre}</th><td className="py-1 text-right">{entero(s.citas)}</td><td className="py-1 text-right">{entero(s.atendidas)}</td><td className="py-1 text-right">{formatoPrecio(s.ingresosCent)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          </div>

          <section aria-labelledby="t-profesionales" className={`${tarjeta} mt-6 overflow-x-auto`}>
            <h3 id="t-profesionales" className="text-xl font-bold">Por profesional</h3>
            <table className="mt-3 w-full min-w-[40rem] text-left tabular-nums">
              <thead className="text-pizarra">
                <tr><th scope="col" className="py-2 font-normal">Profesional</th><th scope="col" className="w-64 py-2 font-normal">Ocupación</th><th scope="col" className="py-2 text-right font-normal">Atendidas</th><th scope="col" className="py-2 text-right font-normal">Ausencias</th><th scope="col" className="py-2 text-right font-normal">Ingresos</th></tr>
              </thead>
              <tbody>
                {e.porProfesional.map((p) => (
                  <tr key={p.id} className="border-t border-linea">
                    <th scope="row" className="py-2 pr-4 font-bold">{p.nombre}</th>
                    <td className="py-2 pr-6"><span className="flex items-center gap-3"><Medidor valor={p.ocupacion} etiqueta={`Ocupación de ${p.nombre}`} /><span className="w-16 shrink-0 text-right">{pct(p.ocupacion)}</span></span></td>
                    <td className="py-2 text-right">{entero(p.atendidas)}</td>
                    <td className="py-2 text-right">{entero(p.noPresentadas)} <span className="text-pizarra">({pct(tasaAusencias(p))})</span></td>
                    <td className="py-2 text-right">{formatoPrecio(p.ingresosCent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-base text-pizarra">La ocupación se calcula con el horario actual de cada profesional{mes === actual ? "; en el mes en curso cuenta también las citas que aún no han llegado" : ""}.</p>
          </section>
        </>
      )}
    </div>
  );
}
