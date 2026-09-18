// Datos de la clínica. Salen de variables de entorno (CLINICA_*); sin ellas, los de la clínica ficticia de la demo
// (dirección, teléfono, NIF y colegiados inventados). El horario no está aquí: se calcula en horario.ts.
// Ojo: solo para código de servidor. En un componente de cliente process.env.CLINICA_* no existe y saldría la demo.
const env = (clave: string, demo: string) => process.env[clave]?.trim() || demo;

/** MODO_DEMO=1: contraseñas a la vista en el login, reinicio diario de los datos, avisos de demo. Sin definir, instalación real. */
export const MODO_DEMO = !!process.env.MODO_DEMO?.trim();

const telefono = env("CLINICA_TELEFONO", "910 000 000");
export const CLINICA = {
  nombre: env("CLINICA_NOMBRE", "Podología Serrano"),
  razonSocial: env("CLINICA_RAZON_SOCIAL", "Podología Serrano, S.L.P."),
  nif: env("CLINICA_NIF", "B-00000000"),
  direccion: env("CLINICA_DIRECCION", "Calle Madrid, 48, local 2"),
  cp: env("CLINICA_CP", "28901"),
  ciudad: env("CLINICA_CIUDAD", "Getafe"),
  provincia: env("CLINICA_PROVINCIA", "Madrid"),
  telefono,
  telefonoHref: `tel:+34${telefono.replace(/\D/g, "")}`,
  email: env("CLINICA_EMAIL", "hola@podologiaserrano.es"),
};

// Para el JSON-LD. Las de la demo son aproximadas: la dirección es ficticia.
export const COORDENADAS = { latitude: Number(env("CLINICA_LAT", "40.3083")), longitude: Number(env("CLINICA_LON", "-3.7327")) };

export const URL_BASE = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const DIRECCION_COMPLETA = `${CLINICA.direccion}, ${CLINICA.cp} ${CLINICA.ciudad} (${CLINICA.provincia})`;

// Reglas de reserva online
export const ANTELACION_MIN_HORAS = 2;
export const ANTELACION_MAX_DIAS = 60;

export const USUARIO_DEMO = { email: "demo@podologiaserrano.es", password: "demo1234" } as const;
// Todos con la misma contraseña. Los de los profesionales abren la agenda filtrada por su columna.
export const USUARIOS_DEMO = [
  { email: USUARIO_DEMO.email, quien: "recepción, ve toda la agenda" },
  { email: "admin@podologiaserrano.es", quien: "administración: además, configuración y usuarios" },
  { email: "laura@podologiaserrano.es", quien: "Dra. Serrano" },
  { email: "marcos@podologiaserrano.es", quien: "Dr. Ortiz" },
];
