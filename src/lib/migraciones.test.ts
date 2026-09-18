import { readFileSync, rmSync } from "node:fs";
import { createClient } from "@libsql/client";
import { afterAll, expect, it } from "vitest";
import { migrar } from "./migraciones";

const RUTA = `/tmp/podologia-test-migraciones-${process.pid}.db`;
afterAll(() => rmSync(RUTA, { force: true }));

// El mismo caso contra un fichero SQLite y, si hay un servidor libSQL a mano, por HTTP: es el protocolo de Turso, y donde
// importa que las claves foráneas se apaguen en la misma conexión. En el CI lo levanta un contenedor (LIBSQL_HTTP_URL);
// en local: docker run -p 8080:8080 ghcr.io/tursodatabase/libsql-server y LIBSQL_HTTP_URL=http://127.0.0.1:8080 npm test
// (con el servidor recién arrancado: el test necesita la base de datos vacía).
const DESTINOS = [["fichero SQLite", `file:${RUTA}`], ...(process.env.LIBSQL_HTTP_URL ? [["servidor libSQL por HTTP", process.env.LIBSQL_HTTP_URL]] : [])];

it.each(DESTINOS)("%s: una base de datos anterior al registro de migraciones, con datos, recibe solo las que le faltan y no pierde nada", async (_, URL) => {
  // Como la dejaba el antiguo crearTablasSiFaltan: las dos primeras migraciones, sin apuntar en ningún sitio.
  const db = createClient({ url: URL });
  for (const m of ["20260917202839_inicial", "20260918104847_panel_avanzado"]) await db.executeMultiple(readFileSync(`prisma/migrations/${m}/migration.sql`, "utf8"));
  await db.executeMultiple(`
    INSERT INTO profesionales (id, slug, nombre, titulo, bio) VALUES ('p1', 'laura', 'Laura', 't', 'b');
    INSERT INTO servicios (id, slug, nombre, descripcion, duracionMin, precioCent) VALUES ('s1', 'quiro', 'Quiropodia', 'd', 45, 4500);
    INSERT INTO usuarios (id, email, nombre, passwordHash) VALUES ('u1', 'ana@clinica.test', 'Ana', 'x');
    INSERT INTO citas (id, servicioId, profesionalId, inicio, fin, pacienteNombre, pacienteTelefono, tokenCancelacion)
      VALUES ('c1', 's1', 'p1', '2026-10-01 08:00:00', '2026-10-01 08:45:00', 'Óscar Peña', '600000001', 'tok1'),
             ('c2', 's1', 'p1', '2026-10-08 08:00:00', '2026-10-08 08:45:00', 'oscar peña', '600000001', 'tok2');
    INSERT INTO franjas_ocupadas (profesionalId, inicio, citaId) VALUES ('p1', '2026-10-01 08:00:00', 'c1'), ('p1', '2026-10-08 08:00:00', 'c2');
  `);

  const aplicadas = await migrar(URL);
  expect(aplicadas.slice(0, 3).map((m) => m.replace(/^\d+_/, ""))).toEqual(["pacientes", "roles_usuarios", "limite_intentos"]);

  const uno = async (sql: string) => (await db.execute(sql)).rows[0];
  // Rehacer la tabla citas no se lleva por delante las franjas (ON DELETE CASCADE) ni las citas
  expect((await uno("SELECT count(*) AS n FROM franjas_ocupadas")).n).toBe(2);
  expect((await uno("SELECT count(DISTINCT pacienteId) AS n FROM citas")).n).toBe(1);
  expect((await uno("SELECT rol FROM usuarios")).rol).toBe("ADMIN");

  expect(await migrar(URL)).toEqual([]); // y la segunda vez no hay nada que hacer
  db.close();
});
