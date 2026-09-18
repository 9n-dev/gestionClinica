"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { reservar, type EstadoReserva } from "./acciones";

type Props = { servicio: string; profesional: string; dia: string; hora: string; urlHoras: string; responsable: string };

export function FormularioPaciente({ urlHoras, responsable, ...cita }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoReserva, FormData>(reservar, {});
  const aviso = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (estado.error) aviso.current?.focus();
  }, [estado]);

  const campo = (nombre: string) => ({
    id: nombre,
    name: nombre,
    required: true,
    className: "campo",
    defaultValue: estado.valores?.[nombre],
    "aria-invalid": estado.campos?.[nombre] ? true : undefined,
    "aria-describedby": estado.campos?.[nombre] ? `${nombre}-error` : undefined,
  });
  const error = (nombre: string) =>
    estado.campos?.[nombre] && <p id={`${nombre}-error`} className="mt-1 font-bold text-error">{estado.campos[nombre]![0]}</p>;

  return (
    <form action={accion} className="max-w-xl space-y-5" noValidate>
      {Object.entries(cita).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}

      {estado.error && (
        <div ref={aviso} tabIndex={-1} role="alert" className="rounded-md border-2 border-error bg-white p-4 font-bold text-error">
          {estado.error}{" "}
          {!estado.campos && <Link href={urlHoras} className="enlace">Elegir otra hora</Link>}
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="etiqueta">Nombre y apellidos</label>
        <input {...campo("nombre")} type="text" autoComplete="name" maxLength={80} />
        {error("nombre")}
      </div>
      <div>
        <label htmlFor="telefono" className="etiqueta">Teléfono móvil</label>
        <input {...campo("telefono")} type="tel" autoComplete="tel" inputMode="tel" aria-describedby={estado.campos?.telefono ? "telefono-error" : "telefono-ayuda"} />
        <p id="telefono-ayuda" className="mt-1 text-base text-pizarra">Solo lo usamos si hay que avisarte de un cambio en tu cita.</p>
        {error("telefono")}
      </div>
      <div>
        <label htmlFor="email" className="etiqueta">Email</label>
        <input {...campo("email")} type="email" autoComplete="email" aria-describedby={estado.campos?.email ? "email-error" : "email-ayuda"} />
        <p id="email-ayuda" className="mt-1 text-base text-pizarra">Aquí te enviamos la confirmación y el enlace para cancelar.</p>
        {error("email")}
      </div>

      {/* Trampa para bots: fuera de pantalla y del orden de tabulación */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="web">No rellenes este campo</label>
        <input id="web" name="web" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <div className="flex items-start gap-3">
          <input
            id="privacidad" name="privacidad" type="checkbox" required className="mt-1 size-6 shrink-0 accent-cobalto"
            defaultChecked={estado.valores?.privacidad === "on"}
            aria-invalid={estado.campos?.privacidad ? true : undefined}
            aria-describedby={estado.campos?.privacidad ? "privacidad-error" : undefined}
          />
          <label htmlFor="privacidad">
            He leído y acepto la <Link href="/legal/privacidad" target="_blank" className="enlace">política de privacidad<span className="sr-only"> (se abre en una pestaña nueva)</span></Link>.
          </label>
        </div>
        {error("privacidad")}
      </div>

      <button className="btn btn-primario px-7 text-lg" disabled={enviando}>{enviando ? "Reservando…" : "Confirmar cita"}</button>

      <p className="text-base text-pizarra">
        Responsable: {responsable}. Finalidad: gestionar tu cita y enviarte la confirmación y un recordatorio. Base legal: tu solicitud de cita.
        No pedimos ni guardamos aquí datos de salud. Puedes acceder, rectificar o suprimir tus datos escribiendo a hola@podologiaserrano.es.
      </p>
    </form>
  );
}
