# Pruebas

```bash
npm test             # lógica: Vitest, contra SQLite temporales con el esquema real
npm run test:e2e     # extremo a extremo: Playwright, contra el build de producción
npm run lint
```

La primera vez, `npx playwright install chromium`. Todo corre en cada push (`.github/workflows/ci.yml`).

## Cómo están planteadas

- **La lógica se prueba contra la base de datos de verdad**, no contra dobles: cada fichero de test crea una SQLite temporal, le aplica las migraciones y trabaja ahí. Lo que garantiza la base de datos (que dos citas no se pisen, que un paciente sea único) solo se puede probar así.
- **Los e2e corren contra el build de producción**, con dos servidores levantados a la vez: uno en modo demo, recién sembrado, y otro como **instalación real**, sin `MODO_DEMO` y con la base de datos vacía.
- **Cada fallo se reproduce antes de arreglarlo.** Los tests con nombre de hallazgo («hallazgos de la auditoría de seguridad», «de la revisión de corrección») nacieron así.
- Los e2e no ven si el modo desarrollo se rompe (pasó una vez, con `instrumentation.ts`): tras tocar ese fichero, el middleware o `next.config.ts`, hay que arrancar `next dev`.

## Lógica (`src/lib/*.test.ts`)

| Fichero | Qué comprueba |
| --- | --- |
| `disponibilidad` | Solapes, franjas de 15 minutos y cálculo de huecos: tramos, duración, citas existentes, bloqueos de varios días, antelación mínima, sábados, y que las horas son de Madrid también tras el cambio de hora |
| `reservas` | Mover (libera y ocupa franjas, no pisa, cambia de profesional), antelación web frente a panel, identidad del paciente, supresión, servicios por profesional, lista de espera, fusión de fichas, y los hallazgos de las dos revisiones: email de la ficha, cancelar una cita pasada, **mover y cancelar a la vez**, recordatorio tras mover, dos reservas simultáneas del mismo paciente nuevo |
| `migraciones` | Una base de datos anterior al registro de migraciones, **con datos**, recibe solo las que le faltan y no pierde nada. Contra un fichero y, en el CI, contra un servidor libSQL por HTTP, que es el protocolo de Turso |
| `acceso` | El enlace pone la contraseña una sola vez, en la base de datos no está el token, y no vale caducado ni para un usuario de la demo |
| `limite` | Tope por ventana, otra clave no se entera, limpieza, IP, e intento devuelto cuando el login acierta |
| `permisos` | Administración y recepción gestionan todo; un profesional, solo lo suyo |
| `retencion` | Borra lo que cumple su plazo y nada más, los pacientes inactivos no se tocan sin plazo fijado, los emails se van con su cita, y restar meses no se pasa de mes |
| `estadisticas` | Minutos disponibles: horario menos bloqueos, sin contar dos veces los que se pisan, y el día del cambio de hora |
| `horario` y `agenda` | Horario público a partir de los de los profesionales; rango de horas que pinta la agenda |
| `festivos` | Los diez nacionales, con el Viernes Santo de varios años |
| `importar` | CSV del Excel español: punto y coma, Windows-1252, comillas con separadores y saltos dentro, columnas por su nombre, filas que no valen |
| `mensajes` | Con la API de Twilio simulada: consola sin credenciales, WhatsApp con plantilla, SMS si Twilio lo rechaza, SMS una sola vez si el fallo llega después por webhook, firma del webhook, texto en GSM-7 |
| `emails/rebotes` | Firma Svix de Resend (y que una petición vieja no vale), rebote que marca el email como fallido, alertas con tope de 10 a la hora y con el detalle escapado |
| `validacion` | El login no distingue mayúsculas en el email |

## Extremo a extremo (`e2e/*.spec.ts`)

| Spec | Recorrido |
| --- | --- |
| `reserva` | Un paciente reserva por la web → la clínica lo ve en su ficha → el paciente cancela con el enlace de su email → pasa al historial |
| `instalacion` | **Instalación real**: `crear-admin` desde la línea de comandos → elegir contraseña → login sin rastro de la demo → profesional, horario y servicios → la web ofrece huecos y el horario del pie sale de ahí → un servicio que alguien no hace no se ofrece con él → el cron de reinicio no existe |
| `usuarios` | Alta de usuario → email → contraseña de un solo uso → entra sin permisos de administración → cambia su contraseña y **cae su otra sesión abierta** → los usuarios de la demo no se pueden cambiar ni recuperar → el equipo no ve los emails con enlaces de acceso |
| `permisos` | Un profesional ve la cita de otro pero no puede tocarla, ni moverla, ni dar citas o bloquear fuera de su columna; recepción sí. Festivos nacionales sin duplicar |
| `privacidad` | Descarga de los datos de un paciente, supresión (no deja con citas pendientes), y el registro de actividad: quién abrió, quién descargó, quién eliminó, sin datos del paciente, y **recorrer la lista no cuenta como abrir fichas** |
| `agenda-tactil` | Con pantalla táctil emulada: mover una cita tocándola y tocando la hora nueva |
| `serie` | Cita periódica: crea la serie, avisa de la fecha sin hueco y lo anuncia en un solo email |
| `espera` | Al cancelarse una cita, el panel propone a quien espera ese hueco, y darle la cita lo saca de la lista |
| `cobros` | Cobro con descuento → caja del día con su forma de pago → anulación |
| `pacientes` | Alta sin cita y fusión de dos fichas de la misma persona |
| `importar` | CSV de Excel en Windows-1252: comprobar, confirmar, y no duplicar al repetir |
| `estadisticas` | Números del mes con su tabla equivalente; el equipo no entra |
| `recordatorios` | El cron avisa al móvil a todos, también a quien no tiene email, y no repite |
| `limite` | A los 10 fallos, el login se cierra para esa conexión aunque luego se acierte |
| `seguridad` | Cabeceras en todas las respuestas, webhooks que rechazan lo que no va firmado, y **la app entera funcionando bajo su propia CSP** sin que el navegador bloquee nada |
| `accesibilidad` | axe-core (WCAG 2.1 A y AA) en la web, la reserva completa y todas las pantallas del panel, con los desplegables abiertos y el modo de mover citas activo |

## Accesibilidad

axe mide lo que se puede medir: contraste, nombres accesibles, etiquetas, ARIA, estructura. La primera pasada encontró dos cosas, ya arregladas: en el modo de mover, las citas llevaban `aria-pressed` siendo enlaces (ahora son botones mientras dura el modo), y en Estadísticas había párrafos como hijos directos de una lista de definiciones. Lo que axe no mide, como que el orden del foco tenga sentido o cómo suena con un lector de pantalla, no está auditado.

## Revisión independiente

Al terminar el grueso del proyecto, dos revisores que no habían visto cómo se escribió el código lo leyeron entero en solo lectura: uno buscando fallos y otro intentando refutar, punto por punto, el modelo de seguridad que declara la [arquitectura](arquitectura.md). Encontraron 17 fallos reales que ni los tests ni el CI veían. Los más serios:

- Sin Resend, cualquiera del equipo podía leer en «Emails y mensajes» el enlace de un solo uso de otro usuario y ponerle la contraseña, también al administrador.
- Mover y cancelar la misma cita a la vez dejaba una cita cancelada con el hueco ocupado para siempre (reproducido en 15 de 15 intentos).
- El límite del login apuntaba el intento después de comprobar la contraseña: una ráfaga simultánea se lo saltaba.
- Una acción de servidor aceptaba por la red un valor que su tipo de TypeScript «prohibía»: el tipo no existe en el servidor.
- Una reserva web anónima podía cambiar el email de la ficha de un paciente existente.

Todos están arreglados, cada uno con el test que lo reproduce. Uno de los arreglos era malo (borrar mensajes por teléfono se llevaba los de otro paciente con el mismo móvil) y lo cazó ese test antes de llegar a ningún sitio.

## Lo que no está probado

- El envío real por Resend y por Twilio, y sus webhooks con peticiones de verdad: no hay cuentas en esta demo. Los tests simulan sus API.
- Las migraciones contra Turso. Sí contra un servidor libSQL por HTTP, que es su protocolo.
- Rendimiento (Lighthouse) y cómo se ven los emails en clientes de correo reales.

---
[Volver al README](../README.md) · [Manual del panel](manual-del-panel.md) · [Arquitectura](arquitectura.md) · [Instalación](instalacion.md) · [Pendiente](pendiente.md)
