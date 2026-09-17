"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ABRIR_BANNER, guardarConsentimiento, useConsentimiento } from "./consentimiento";

export function BannerCookies() {
  const consentimiento = useConsentimiento();
  const [reabierto, setReabierto] = useState(false);

  useEffect(() => {
    const abrir = () => setReabierto(true);
    window.addEventListener(ABRIR_BANNER, abrir);
    return () => window.removeEventListener(ABRIR_BANNER, abrir);
  }, []);

  if (consentimiento === undefined || (consentimiento !== null && !reabierto)) return null;

  const elegir = (v: "todas" | "necesarias") => {
    guardarConsentimiento(v);
    setReabierto(false);
  };

  return (
    <section aria-label="Aviso de cookies" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-cobalto bg-white">
      <div className="contenedor flex flex-col gap-4 py-4 md:flex-row md:items-center">
        <p className="text-base md:flex-1">
          Usamos cookies técnicas para que la web funcione. Solo si nos das permiso cargamos además el mapa de Google Maps, que instala cookies de
          terceros. {consentimiento && <>Ahora mismo tienes {consentimiento === "todas" ? "aceptadas todas" : "solo las necesarias"}. </>}
          <Link href="/legal/cookies" className="enlace">Política de cookies</Link>
        </p>
        {/* Misma prominencia para aceptar y rechazar, como pide la AEPD */}
        <div className="flex gap-3">
          <button onClick={() => elegir("necesarias")} className="btn btn-secundario flex-1">Rechazar</button>
          <button onClick={() => elegir("todas")} className="btn btn-secundario flex-1">Aceptar</button>
        </div>
      </div>
    </section>
  );
}

export function BotonConfigurarCookies({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(ABRIR_BANNER))}>
      Configurar cookies
    </button>
  );
}
