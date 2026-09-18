// Datos de la clínica. Todo es ficticio (dirección, teléfono, NIF y colegiados).
export const CLINICA = {
  nombre: "Podología Serrano",
  razonSocial: "Podología Serrano, S.L.P.",
  nif: "B-00000000",
  direccion: "Calle Madrid, 48, local 2",
  cp: "28901",
  ciudad: "Getafe",
  provincia: "Madrid",
  telefono: "910 000 000",
  telefonoHref: "tel:+34910000000",
  email: "hola@podologiaserrano.es",
  horario: [
    { dias: "Lunes a viernes", horas: "9:00 – 14:00 y 16:00 – 20:00" },
    { dias: "Sábados", horas: "9:00 – 13:00 (Dra. Serrano)" },
    { dias: "Domingos y festivos", horas: "Cerrado" },
  ],
} as const;

export const DIRECCION_COMPLETA = `${CLINICA.direccion}, ${CLINICA.cp} ${CLINICA.ciudad} (${CLINICA.provincia})`;

// Reglas de reserva online
export const ANTELACION_MIN_HORAS = 2;
export const ANTELACION_MAX_DIAS = 60;

export const USUARIO_DEMO = { email: "demo@podologiaserrano.es", password: "demo1234" } as const;
// Todos con la misma contraseña. Los de los profesionales abren la agenda filtrada por su columna.
export const USUARIOS_DEMO = [
  { email: USUARIO_DEMO.email, quien: "recepción, ve toda la agenda" },
  { email: "laura@podologiaserrano.es", quien: "Dra. Serrano" },
  { email: "marcos@podologiaserrano.es", quien: "Dr. Ortiz" },
];
