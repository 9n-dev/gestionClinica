import { expect, it } from "vitest";
import { esquemaLogin } from "./validacion";

it("el login no distingue mayúsculas en el email, como el resto de la app (los usuarios se guardan en minúsculas)", () => {
  expect(esquemaLogin.parse({ email: "Ana@Clinica.ES", password: "x" }).email).toBe("ana@clinica.es");
});
