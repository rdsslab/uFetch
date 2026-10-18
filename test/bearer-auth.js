// Validación de setBearerAuthorization y constructor con bearerAuthentication
// Evita regresión del bug de [object Object] en Authorization
const uFetch = require("../src/fetch.js");

function assert(cond, msg) {
  if (!cond) throw new Error("FALLA: " + msg);
}

// Caso 1: sin autenticación
{
  const u = new uFetch("http://example.com");
  assert(u._bearer_authentication === undefined, "caso 1: no debe tener bearer");
  assert(u._basic_authentication === undefined, "caso 1: no debe tener basic");
}

// Caso 2: objeto vacío
{
  const u = new uFetch("http://example.com");
  u.setBearerAuthorization({});
  assert(u._bearer_authentication === undefined, "caso 2: objeto vacío debe limpiar bearer");
  assert(u._basic_authentication === undefined, "caso 2: objeto vacío debe limpiar basic");
}

// Caso 3: objeto con token (error común del login)
{
  const u = new uFetch("http://example.com");
  u.setBearerAuthorization({ token: "abc" });
  assert(u._bearer_authentication === undefined, "caso 3: objeto con token debe limpiar bearer");
}

// Caso 4: número
{
  const u = new uFetch("http://example.com");
  u.setBearerAuthorization(12345);
  assert(u._bearer_authentication === undefined, "caso 4: número debe limpiar bearer");
}

// Caso 5: constructor con objeto vacío
{
  const u = new uFetch("http://example.com", { bearerAuthentication: {} });
  assert(u._bearer_authentication === undefined, "caso 5: constructor con {} debe limpiar bearer");
}

// Caso válido: string
{
  const u = new uFetch("http://example.com");
  u.setBearerAuthorization("mytoken");
  assert(u._bearer_authentication === "Bearer mytoken", "caso válido: token debe ser Bearer mytoken");
  assert(u._basic_authentication === undefined, "caso válido: basic debe ser undefined");
}

console.log("test/bearer-auth.js: todos los casos pasaron.");
