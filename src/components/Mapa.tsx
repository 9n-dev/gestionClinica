"use client";

import { guardarConsentimiento, useConsentimiento } from "./consentimiento";

/** La dirección llega por prop: este componente corre en el navegador, donde no hay variables CLINICA_*. */
export function Mapa({ direccion }: { direccion: string }) {
  const CONSULTA = encodeURIComponent(direccion);
  const consentimiento = useConsentimiento();

  if (consentimiento === "todas")
    return (
      <iframe
        title={`Mapa de Google con la ubicación de la clínica: ${direccion}`}
        src={`https://www.google.com/maps?q=${CONSULTA}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-96 w-full rounded-lg border border-linea"
      />
    );

  return (
    <div className="grid h-96 place-items-center rounded-lg border border-dashed border-pizarra bg-white p-6 text-center">
      <div className="max-w-md">
        <p className="font-bold">{direccion}</p>
        <p className="mt-2 text-pizarra">El mapa es de Google Maps e instala cookies de terceros, por eso no lo cargamos sin tu permiso.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button className="btn btn-secundario" onClick={() => guardarConsentimiento("todas")}>Aceptar cookies y ver el mapa</button>
          <a className="btn btn-secundario" href={`https://www.google.com/maps/search/?api=1&query=${CONSULTA}`} target="_blank" rel="noopener noreferrer">
            Abrir en Google Maps<span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
