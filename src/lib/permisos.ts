// Quién puede MODIFICAR citas y bloqueos. Ver, los ven todos.
//   Administración ............................. todo
//   Equipo sin profesional (recepción) ......... todo
//   Equipo ligado a un profesional ............. solo lo de ese profesional
type Quien = { rol: "ADMIN" | "EQUIPO"; profesionalId: string | null };

export const gestionaTodo = (u: Quien) => u.rol === "ADMIN" || !u.profesionalId;

/** `profesionalId` null = algo de toda la clínica (un bloqueo general). */
export const puedeGestionar = (u: Quien, profesionalId: string | null) => gestionaTodo(u) || (profesionalId !== null && u.profesionalId === profesionalId);

export const SOLO_LO_TUYO = "Solo puedes modificar tus propias citas y bloqueos.";
