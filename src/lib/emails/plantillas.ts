import { CLINICA, DIRECCION_COMPLETA } from "../clinica";
import { formatoFechaLarga, formatoHora, formatoPrecio } from "../fechas";

export type CitaCompleta = {
  id: string;
  inicio: Date;
  pacienteNombre: string;
  pacienteTelefono: string;
  pacienteEmail: string;
  tokenCancelacion: string;
  servicio: { nombre: string; duracionMin: number; precioCent: number };
  profesional: { nombre: string };
};

const URL_BASE = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const urlCita = (token: string) => `${URL_BASE()}/cita/${token}`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function marco(titulo: string, cuerpo: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#15203b;font-size:16px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:18px;font-weight:bold;color:#2346c4;margin:0 0 16px">${CLINICA.nombre}</p>
<div style="background:#ffffff;border:1px solid #d3dce8;border-radius:8px;padding:24px">
<h1 style="font-size:22px;margin:0 0 16px">${titulo}</h1>
${cuerpo}
</div>
<p style="font-size:13px;color:#55617a;margin:16px 0 0">${CLINICA.nombre} · ${DIRECCION_COMPLETA} · ${CLINICA.telefono}<br>
Recibes este mensaje porque se ha gestionado una cita con este email. Demo con datos ficticios.</p>
</div></body></html>`;
}

const ficha = (c: CitaCompleta, conPaciente = false) => `<table style="border-collapse:collapse;margin:16px 0;width:100%">
${[
  ["Servicio", `${c.servicio.nombre} (${c.servicio.duracionMin} min, ${formatoPrecio(c.servicio.precioCent)})`],
  ["Día", formatoFechaLarga(c.inicio)],
  ["Hora", formatoHora(c.inicio)],
  ["Profesional", c.profesional.nombre],
  ...(conPaciente ? [["Paciente", c.pacienteNombre], ["Teléfono", c.pacienteTelefono], ["Email", c.pacienteEmail]] : [["Dirección", DIRECCION_COMPLETA]]),
]
  .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#55617a;vertical-align:top">${k}</td><td style="padding:6px 0;font-weight:bold">${esc(v)}</td></tr>`)
  .join("")}
</table>`;

const boton = (href: string, texto: string) =>
  `<p style="margin:20px 0 0"><a href="${href}" style="display:inline-block;background:#2346c4;color:#ffffff;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:6px">${texto}</a></p>`;

const nombrePila = (c: CitaCompleta) => esc(c.pacienteNombre.split(" ")[0]);

export const plantillas = {
  confirmacionPaciente: (c: CitaCompleta) => ({
    asunto: `Cita confirmada: ${formatoFechaLarga(c.inicio)} a las ${formatoHora(c.inicio)}`,
    html: marco("Tu cita está confirmada", `<p>Hola, ${nombrePila(c)}. Te esperamos en la clínica:</p>${ficha(c)}
<p>Si no puedes venir, cancela la cita desde este enlace para que otra persona aproveche el hueco.</p>${boton(urlCita(c.tokenCancelacion), "Ver o cancelar mi cita")}`),
  }),
  avisoClinica: (c: CitaCompleta) => ({
    asunto: `Nueva cita online: ${c.pacienteNombre}, ${formatoFechaLarga(c.inicio)} ${formatoHora(c.inicio)}`,
    html: marco("Nueva cita reservada por la web", `${ficha(c, true)}${boton(`${URL_BASE()}/panel/citas/${c.id}`, "Abrir en el panel")}`),
  }),
  recordatorio: (c: CitaCompleta) => ({
    asunto: `Recordatorio: tu cita del ${formatoFechaLarga(c.inicio)} a las ${formatoHora(c.inicio)}`,
    html: marco("Te recordamos tu cita", `<p>Hola, ${nombrePila(c)}. Esto es un recordatorio de tu próxima cita:</p>${ficha(c)}
<p>Si al final no puedes venir, avísanos cancelándola aquí:</p>${boton(urlCita(c.tokenCancelacion), "Ver o cancelar mi cita")}`),
  }),
  cancelacionPaciente: (c: CitaCompleta) => ({
    asunto: `Cita cancelada: ${formatoFechaLarga(c.inicio)} a las ${formatoHora(c.inicio)}`,
    html: marco("Tu cita se ha cancelado", `<p>Hola, ${nombrePila(c)}. Esta cita ha quedado cancelada:</p>${ficha(c)}
<p>Puedes pedir otra cuando quieras.</p>${boton(`${URL_BASE()}/reservar`, "Pedir otra cita")}`),
  }),
  cancelacionClinica: (c: CitaCompleta) => ({
    asunto: `Cita cancelada: ${c.pacienteNombre}, ${formatoFechaLarga(c.inicio)} ${formatoHora(c.inicio)}`,
    html: marco("Se ha cancelado una cita", `<p>El hueco vuelve a estar disponible en la web.</p>${ficha(c, true)}`),
  }),
};
