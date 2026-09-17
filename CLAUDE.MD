Quiero construir una demo profesional de portfolio: web + sistema de citas online para una clínica de podología ficticia. Debe parecer un producto real que podría vender a clínicas pequeñas.

## Contexto de negocio
- Clínica: "Podología Serrano", Getafe (Madrid). Dos profesionales: Dra. Laura Serrano y Dr. Marcos Ortiz.
- Servicios (duración / precio): Consulta general (30 min / 40 €), Quiropodia (45 min / 45 €), Estudio de la pisada (60 min / 80 €), Plantillas a medida – revisión (30 min / 35 €).
- Horario: L-V 9:00-14:00 y 16:00-20:00. Sábados 9:00-13:00 solo la Dra. Serrano.
- Idioma de toda la interfaz: español.

## Stack (no cambiar sin preguntarme)
- Next.js 15 (App Router) + TypeScript + Tailwind.
- Base de datos: SQLite con Prisma (fácil de desplegar y de resetear para demo).
- Auth del panel: Auth.js con credenciales (usuario/contraseña), sin OAuth.
- Emails: Resend. Si no hay API key en .env, hacer fallback a log en consola y guardar el email en una tabla "emails_enviados" para poder enseñarlos en el panel.
- Despliegue previsto en Vercel (evita dependencias que no funcionen ahí).

## Funcionalidad

### Web pública
- Home, Servicios, Equipo, Contacto (mapa embebido, teléfono, horario).
- Cada servicio tiene botón "Pedir cita".
- Aviso legal, privacidad y política de cookies con banner funcional (España, RGPD).
- Accesible (WCAG AA), rápida, sin librerías de UI pesadas. Diseño limpio y sanitario, no genérico: define una paleta y tipografía propias.

### Flujo de reserva (/reservar)
1. Elegir servicio → 2. elegir profesional (o "cualquiera") → 3. calendario con huecos disponibles reales según horario, duración y citas existentes → 4. datos del paciente (nombre, teléfono, email; NO pedir datos de salud) → 5. confirmación.
- Validación con Zod. Evitar dobles reservas a nivel de base de datos.
- Al confirmar: email al paciente y email a la clínica. Enlace de cancelación con token.
- Recordatorio 24 h antes: implementar como endpoint /api/cron/recordatorios protegido por secret, pensado para Vercel Cron.

### Panel profesional (/panel)
- Login. Vista de agenda por día y semana, filtrable por profesional.
- Ver detalle de cita, cancelarla, marcar como atendida.
- Bloquear huecos (vacaciones, comidas).
- Lista de emails enviados (para la demo).

### Modo demo
- Usuario demo: demo@podologiaserrano.es / demo1234, visible en la página de login.
- Script `npm run seed` que resetea la base de datos y carga: profesionales, servicios, bloqueos y ~40 citas repartidas en las próximas dos semanas con nombres de pacientes ficticios.
- Banner discreto "Esta es una demo, los datos se reinician cada día".

## Forma de trabajar
- Antes de escribir código, proponme la estructura de carpetas y el modelo de datos de Prisma y espera mi OK.
- Después avanza por fases y para al final de cada una: (1) esquema + seed + auth, (2) web pública, (3) flujo de reserva, (4) panel, (5) emails y cron, (6) legal, accesibilidad y pulido.
- Commits pequeños con mensajes claros. README con instrucciones de instalación, variables de entorno y despliegue en Vercel.
- Escribe tests solo para la lógica de disponibilidad (cálculo de huecos y solapamientos); es la parte que más falla.
- Si algo del enunciado es ambiguo, pregunta; no inventes requisitos.
