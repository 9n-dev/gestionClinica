"use client";

import { useSyncExternalStore } from "react";

// Consentimiento de cookies (RGPD/LSSI). "todas" permite el mapa de Google; "necesarias" no.
export type Consentimiento = "todas" | "necesarias" | null;

const CAMBIO = "consentimiento-cambio";
export const ABRIR_BANNER = "consentimiento-abrir";
const SEIS_MESES = 60 * 60 * 24 * 180;

const leer = () => (document.cookie.match(/(?:^|; )consentimiento=(todas|necesarias)/)?.[1] ?? null) as Consentimiento;

export function guardarConsentimiento(valor: "todas" | "necesarias") {
  document.cookie = `consentimiento=${valor}; path=/; max-age=${SEIS_MESES}; samesite=lax`;
  window.dispatchEvent(new Event(CAMBIO));
}

const suscribir = (fn: () => void) => {
  window.addEventListener(CAMBIO, fn);
  return () => window.removeEventListener(CAMBIO, fn);
};

/** undefined mientras se hidrata (todavía no se sabe), luego el valor guardado o null. */
export const useConsentimiento = () => useSyncExternalStore<Consentimiento | undefined>(suscribir, leer, () => undefined);
