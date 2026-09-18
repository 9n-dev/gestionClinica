import "dotenv/config";
import { migrar } from "../src/lib/migraciones";

// `npm run migrar`. También corre antes de cada build, así que cada despliegue deja la base de datos al día.
migrar().then((aplicadas) => console.log(aplicadas.length ? aplicadas.map((m) => `Migración aplicada: ${m}`).join("\n") : "Base de datos al día."));
