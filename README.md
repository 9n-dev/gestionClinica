# Podología Serrano — web y citas online para clínicas pequeñas

[![CI](https://github.com/9n-dev/gestionClinica/actions/workflows/ci.yml/badge.svg)](https://github.com/9n-dev/gestionClinica/actions/workflows/ci.yml)

Web pública, reserva de citas online y panel de gestión para una clínica pequeña, hecho como un producto que se puede instalar y no como una maqueta. La clínica de la demo (Podología Serrano, Getafe) es ficticia: nombres, pacientes, NIF, teléfono y dirección son inventados.

![Agenda semanal del panel, con las citas de cada profesional en su columna](docs/capturas/panel-agenda-semana.png)

**En pocas líneas:**

- **El paciente** reserva en cuatro pasos sin registrarse, recibe confirmación y recordatorio (email, y WhatsApp con SMS de reserva) y cancela desde un enlace.
- **Recepción** lleva la agenda arrastrando citas (o tocándolas, en una tablet), las fichas de pacientes, la lista de espera, los cobros y la caja del día.
- **Administración** configura servicios, profesionales y horarios, da de alta al equipo, ve estadísticas e ingresos, e importa la cartera de pacientes desde Excel.
- **Dos citas a la misma hora son imposibles**, y lo garantiza la base de datos, no una comprobación previa.
- **Datos de salud tratados como tales**: registro de quién abre cada ficha, descarga y supresión de los datos de un paciente, plazos de conservación automáticos, permisos por profesional.
- **Instalable**: una variable separa la demo de una clínica real, las migraciones se aplican solas en cada despliegue y el primer administrador sale de un comando.
- **Probado**: tests de la lógica contra SQLite y contra un servidor libSQL por HTTP, y 18 pruebas de extremo a extremo en un navegador contra el build de producción, incluida una auditoría de accesibilidad (axe, WCAG 2.1 AA) de todas las pantallas. Todo corre en cada push.
- **Sin librerías de interfaz ni de gráficos**: HTML semántico, Server Components, Server Actions y CSS.

| | |
| --- | --- |
| ![Portada de la web pública](docs/capturas/web-inicio.png) | ![Reserva online: elegir día y hora](docs/capturas/web-reservar-3-dia-y-hora.png) |
| ![Ficha de un paciente con su historial](docs/capturas/panel-ficha-paciente.png) | ![Estadísticas: ingresos, ocupación y ausencias](docs/capturas/panel-estadisticas.png) |
| ![Caja del día por forma de pago](docs/capturas/panel-caja.png) | ![La web, la reserva y la agenda en un móvil](docs/capturas/movil.png) |

Las capturas se regeneran con `node scripts/capturas.mjs` (también sirve para repasar todas las pantallas de un vistazo).

**Acceso al panel de la demo** (en `/panel`), todos con contraseña `demo1234`:
- `demo@podologiaserrano.es`: recepción, ve toda la agenda.
- `admin@podologiaserrano.es`: administración. Además ve «Configuración» y «Usuarios».
- `laura@podologiaserrano.es` y `marcos@podologiaserrano.es`: cada profesional entra con su agenda filtrada.

La misma base de código sirve para la demo y para una clínica real: lo decide la variable `MODO_DEMO` (ver [Instalación](docs/instalacion.md#instalarlo-en-una-clínica-real)).

## Documentación

| | |
| --- | --- |
| **[Manual del panel](docs/manual-del-panel.md)** | Pantalla a pantalla, con capturas: la reserva que ve el paciente, y agenda, citas, pacientes, lista de espera, caja, bloqueos, estadísticas, configuración y usuarios |
| **[Arquitectura](docs/arquitectura.md)** | Modelo de datos y las decisiones que importan: dobles reservas imposibles, identidad del paciente, roles y sesiones, protección de datos, límite de intentos, zonas horarias |
| **[Instalación y despliegue](docs/instalacion.md)** | En local, variables de entorno, Vercel + Turso, instalarlo en una clínica real y qué está probado y qué no |
| **[Pruebas](docs/pruebas.md)** | Qué comprueba cada test, la auditoría de accesibilidad, el CI y la revisión independiente del código |
| **[Lo que queda fuera](docs/pendiente.md)** | Lo que no está hecho a propósito, y por qué |

## Qué incluye

- **Web pública**: inicio, servicios y precios, equipo, contacto con mapa, aviso legal, privacidad y política de cookies con banner funcional (el mapa de Google solo se carga si se aceptan las cookies de terceros).
- **Reserva en `/reservar`**: servicio → profesional (o «me da igual») → día y hora con huecos reales → datos de contacto → confirmación. No se pide ningún dato de salud.
- **Sin dobles reservas, garantizado por la base de datos** ([cómo](docs/arquitectura.md#dobles-reservas)).
- **Emails** de confirmación, aviso a la clínica, cancelación y recordatorio, con enlace de cancelación por token.
- **Recordatorio al móvil** por WhatsApp y, si no llega, por SMS (Twilio). Llega también a quien reservó por teléfono y no dio email.
- **Panel en `/panel`**:
  - Agenda por día y semana, filtrable por profesional. **Arrastra una cita** para cambiarla de hora o de profesional, o en una tablet tócala y toca la hora nueva; pulsa en un hueco libre para crear una.
  - Crear citas desde el panel (teléfono, mostrador): sin antelación mínima y con email opcional. **Citas periódicas**: la misma cada N semanas; la fecha que no tenga hueco se salta y se avisa, y toda la serie se anuncia en un solo email con un enlace de cancelación por fecha.
  - Detalle de cita: cambiar hora (también sin ratón), marcar como atendida o «no se presentó», cancelar, notas internas.
  - **Pacientes**: se crean solos con la primera cita (por la web o desde el panel). Buscador sin acentos, ficha con historial, visitas, faltas y notas, y «nueva cita» con los datos ya puestos. Al abrir una cita se avisa si ese paciente ha faltado otras veces.
  - **Importar pacientes** desde un CSV de Excel (solo administración): primero comprueba el fichero y enseña qué entraría y qué filas tienen problemas; al confirmar, no duplica a quien ya existe.
  - **Cobros y caja**: en el detalle de cada cita se apunta el cobro (efectivo, tarjeta, Bizum o transferencia) con el importe editable por si hay descuento. «Caja» suma lo cobrado cada día por forma de pago, para cuadrar el cajón y el datáfono, y avisa de lo atendido ese día que sigue sin cobrar. Un profesional ve su caja; recepción y administración, la de todos.
  - **Lista de espera**: se apunta desde la ficha a quien quiere venir antes. Cuando se cancela una cita, su detalle y el email de aviso a la clínica dicen a quién de la lista le encaja ese hueco (le cabe el servicio, lo hace ese profesional y lo pidió a él o le daba igual), por orden de llegada; «Darle esta cita» abre el formulario con todo puesto y, al crearla, sale de la lista. Decide una persona, no un mensaje automático: no todos los huecos valen para todos.
  - Bloqueo de horas (comidas, vacaciones) con aviso si hay citas dentro, y los **festivos nacionales** del año con un botón (Viernes Santo incluido, calculado); los autonómicos y locales se añaden a mano.
  - Configuración (solo administración): alta y edición de servicios y precios, de profesionales y del horario semanal de cada uno. El horario que se ve en la web y en el JSON-LD se calcula de ahí.
  - **Estadísticas** (solo administración): ingresos, citas atendidas, ocupación de la agenda y ausencias del mes, comparados con el anterior; tendencia de seis meses, reparto por servicio y por profesional.
  - **Menú** con lo de todos los días a la vista, lo esporádico en «Gestión» y la página actual marcada; en móvil y tablet cabe en una fila.
  - **Usuarios y roles** (solo administración): alta, cambio de rol y baja. Nadie escribe la contraseña de otro: el usuario nuevo recibe un enlace de un solo uso para elegirla, y el mismo mecanismo sirve para «he olvidado mi contraseña».
  - Registro de todos los emails enviados.
- **Protección de datos**: registro de actividad (quién abrió o cambió qué; abrir una ficha también cuenta), descarga de los datos de un paciente en JSON (derecho de acceso) y eliminación de sus datos (derecho de supresión).
- **Límite de intentos** en el login, en la reserva web y en la recuperación de contraseña.
- **Modo demo**: `npm run seed` y un cron diario que reinicia los datos.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 sobre SQLite/libSQL · Auth.js v5 (credenciales) · Zod · Resend · Twilio (API REST, sin SDK) · Vitest · Playwright · GitHub Actions.

Sin librerías de UI: HTML semántico, Server Components y Server Actions. El asistente de reserva guarda su estado en la URL, así que funciona el botón «atrás» y casi no necesita JavaScript.

## Puesta en marcha

Requisitos: Node.js 20.9 o superior (probado con Node 22).

```bash
npm install          # instala y genera el cliente de Prisma
cp .env.example .env # y cambia AUTH_SECRET (npx auth secret) y CRON_SECRET
npm run seed         # crea las tablas y carga los datos de la demo (necesita MODO_DEMO=1, que ya viene en .env.example)
npm run dev          # http://localhost:3000
```

Comandos, variables de entorno y despliegue: [Instalación](docs/instalacion.md).

## Licencia

Sin licencia: el código está publicado para que se pueda leer y valorar, no para reutilizarlo. Todos los derechos reservados. Si te interesa usarlo en una clínica, escríbeme.

La clínica, los profesionales y los pacientes que aparecen son ficticios.
