import { CLINICA, DIRECCION_COMPLETA, MODO_DEMO, URL_BASE } from "../clinica";
import { formatoFechaLarga, formatoHora, formatoPrecio } from "../fechas";

export type CitaCompleta = {
  id: string;
  inicio: Date;
  pacienteNombre: string;
  pacienteTelefono: string;
  pacienteEmail: string | null;
  tokenCancelacion: string;
  servicio: { nombre: string; duracionMin: number; precioCent: number };
  profesional: { nombre: string };
};

export const urlCita = (token: string) => `${URL_BASE()}/cita/${token}`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function marco(titulo: string, cuerpo: string, motivo = "se ha gestionado una cita con este email") {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#15203b;font-size:16px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:18px;font-weight:bold;color:#2346c4;margin:0 0 16px">${CLINICA.nombre}</p>
<div style="background:#ffffff;border:1px solid #d3dce8;border-radius:8px;padding:24px">
<h1 style="font-size:22px;margin:0 0 16px">${titulo}</h1>
${cuerpo}
</div>
<p style="font-size:13px;color:#55617a;margin:16px 0 0">${CLINICA.nombre} · ${DIRECCION_COMPLETA} · ${CLINICA.telefono}<br>
Recibes este mensaje porque ${motivo}.${MODO_DEMO ? " Demo con datos ficticios." : ""}</p>
</div></body></html>`;
}

const ficha = (c: CitaCompleta, conPaciente = false) => `<table style="border-collapse:collapse;margin:16px 0;width:100%">
${[
  ["Servicio", `${c.servicio.nombre} (${c.servicio.duracionMin} min, ${formatoPrecio(c.servicio.precioCent)})`],
  ["Día", formatoFechaLarga(c.inicio)],
  ["Hora", formatoHora(c.inicio)],
  ["Profesional", c.profesional.nombre],
  ...(conPaciente ? [["Paciente", c.pacienteNombre], ["Teléfono", c.pacienteTelefono], ["Email", c.pacienteEmail ?? "sin email"]] : [["Dirección", DIRECCION_COMPLETA]]),
]
  .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#55617a;vertical-align:top">${k}</td><td style="padding:6px 0;font-weight:bold">${esc(v)}</td></tr>`)
  .join("")}
</table>`;

const boton = (href: string, texto: string) =>
  `<p style="margin:20px 0 0"><a href="${href}" style="display:inline-block;background:#2346c4;color:#ffffff;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:6px">${texto}</a></p>`;

const nombrePila = (c: CitaCompleta) => esc(c.pacienteNombre.split(" ")[0]);

export const plantillas = {
  acceso: (nombre: string, url: string, invitacion: boolean) => ({
    asunto: invitacion ? `Tu acceso al panel de ${CLINICA.nombre}` : "Cambia tu contraseña del panel",
    html: marco(
      invitacion ? "Te han dado acceso al panel" : "Cambia tu contraseña",
      `<p>Hola, ${esc(nombre.split(" ")[0])}. ${invitacion ? "Ya tienes usuario en el panel de la clínica. Solo falta que elijas tu contraseña." : "Alguien, esperamos que tú, ha pedido cambiar la contraseña de tu usuario del panel."}</p>
${boton(url, invitacion ? "Elegir mi contraseña" : "Cambiar mi contraseña")}
<p style="margin:20px 0 0">Si el botón no funciona, copia esta dirección en el navegador:<br><span style="word-break:break-all">${url}</span></p>
<p>El enlace vale una sola vez y caduca en ${invitacion ? "3 días" : "1 hora"}.${invitacion ? "" : " Si no has sido tú, no hagas nada: tu contraseña sigue siendo la misma."}</p>`,
      "tienes usuario en el panel de la clínica",
    ),
  }),

  confirmacionPaciente: (c: CitaCompleta) => ({
    asunto: `Cita confirmada: ${formatoFechaLarga(c.inicio)} a las ${formatoHora(c.inicio)}`,
    html: marco("Tu cita está confirmada", `<p>Hola, ${nombrePila(c)}. Te esperamos en la clínica:</p>${ficha(c)}
<p>Si no puedes venir, cancela la cita desde este enlace para que otra persona aproveche el hueco.</p>${boton(urlCita(c.tokenCancelacion), "Ver o cancelar mi cita")}`),
  }),
  avisoClinica: (c: CitaCompleta) => ({
    asunto: `Nueva cita online: ${c.pacienteNombre}, ${formatoFechaLarga(c.inicio)} ${formatoHora(c.inicio)}`,
    html: marco("Nueva cita reservada por la web", `${ficha(c, true)}${boton(`${URL_BASE()}/panel/citas/${c.id}`, "Abrir en el panel")}`),
  }),
  /**
   * Recordatorio al móvil. `texto` es el SMS; `variables` rellena, en este orden, los huecos de la plantilla de WhatsApp
   * que la clínica tiene aprobada en Twilio: {{1}} nombre, {{2}} día, {{3}} hora, {{4}} profesional, {{5}} enlace.
   */
  recordatorioMovil: (c: CitaCompleta) => ({
    texto: `${CLINICA.nombre}: te recordamos tu cita del ${formatoFechaLarga(c.inicio)} a las ${formatoHora(c.inicio)} con ${c.profesional.nombre}. Si no puedes venir, cancélala aquí: ${urlCita(c.tokenCancelacion)}`,
    variables: [c.pacienteNombre.split(" ")[0], formatoFechaLarga(c.inicio), formatoHora(c.inicio), c.profesional.nombre, urlCita(c.tokenCancelacion)],
  }),
  recordatorio: (c: CitaCompleta) => ({
    asunto: `Recordatorio: tu cita del ${formatoFechaLarga(c.inicio)} a las ${formatoHora(c.inicio)}`,
    html: marco("Te recordamos tu cita", `<p>Hola, ${nombrePila(c)}. Esto es un recordatorio de tu próxima cita:</p>${ficha(c)}
<p>Si al final no puedes venir, avísanos cancelándola aquí:</p>${boton(urlCita(c.tokenCancelacion), "Ver o cancelar mi cita")}`),
  }),
  modificacionPaciente: (c: CitaCompleta) => ({
    asunto: `Tu cita ha cambiado: ahora es el ${formatoFechaLarga(c.inicio)} a las ${formatoHora(c.inicio)}`,
    html: marco("Tu cita ha cambiado de hora", `<p>Hola, ${nombrePila(c)}. Desde la clínica hemos movido tu cita. Estos son los datos nuevos:</p>${ficha(c)}
<p>Si la hora nueva no te viene bien, llámanos al ${CLINICA.telefono} o cancela la cita aquí:</p>${boton(urlCita(c.tokenCancelacion), "Ver o cancelar mi cita")}`),
  }),
  cancelacionPaciente: (c: CitaCompleta) => ({
    asunto: `Cita cancelada: ${formatoFechaLarga(c.inicio)} a las ${formatoHora(c.inicio)}`,
    html: marco("Tu cita se ha cancelado", `<p>Hola, ${nombrePila(c)}. Esta cita ha quedado cancelada:</p>${ficha(c)}
<p>Puedes pedir otra cuando quieras.</p>${boton(`${URL_BASE()}/reservar`, "Pedir otra cita")}`),
  }),
  cancelacionClinica: (c: CitaCompleta, enEspera = 0) => ({
    asunto: `Cita cancelada: ${c.pacienteNombre}, ${formatoFechaLarga(c.inicio)} ${formatoHora(c.inicio)}`,
    html: marco("Se ha cancelado una cita", `<p>El hueco vuelve a estar disponible en la web.</p>${ficha(c, true)}${
      enEspera ? `<p><strong>${enEspera === 1 ? "Hay una persona" : `Hay ${enEspera} personas`} en la lista de espera a quien le encaja este hueco.</strong></p>${boton(`${URL_BASE()}/panel/citas/${c.id}`, "Ver a quién ofrecérselo")}` : ""
    }`),
  }),
};
