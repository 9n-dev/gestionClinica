"use client";

import { DIRECCION_COMPLETA } from "@/lib/clinica";
import { guardarConsentimiento, useConsentimiento } from "./consentimiento";

const CONSULTA = encodeURIComponent(DIRECCION_COMPLETA);

export function Mapa() {
  const consentimiento = useConsentimiento();

  if (consentimiento === "todas")
    return (
      <iframe
        title={`Mapa de Google con la ubicación de la clínica: ${DIRECCION_COMPLETA}`}
        src={`https://www.google.com/maps?q=${CONSULTA}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-96 w-full rounded-lg border border-linea"
      />
    );

  return (
    <div className="grid h-96 place-items-center rounded-lg border border-dashed border-pizarra bg-white p-6 text-center">
      <div className="max-w-md">
        <p className="font-bold">{DIRECCION_COMPLETA}</p>
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
