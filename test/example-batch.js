const uFetch = require("../src/fetch.js");

// Definimos la API origen
const api = new uFetch("https://httpbin.org");

async function run() {
  console.log("=== Testing BATCH Parallel Processing ===");

  // batch() aplica siempre el mismo url/method/headers/options/timeout a TODOS los items.
  // Cada item es el payload puro: se envía tal cual como `data` (querystring en GET) a /get.
  const payloadList = [
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
    { id: 5 },
  ];

  // Nueva forma limpia: usando un único objeto de configuración
  const results = await api.batch({
    url: "/get",
    method: "GET",
    items: payloadList,
    config: {
      concurrency: 3,
      includeResponse: true, // Habilitar explícitamente para demostración
      onProgress: (info) => {
        console.log(`[Progreso en vivo]: ${info.completed}/${info.total} -> item id=${info.item.id}`);
        if (info.isError) {
           console.warn(`    \\--> [AVISO] Falló la petición.`);
        } else {
           console.log(`    \\--> [EXITO] Respuesta HTTP lograda: ${info.httpCode} | Parser Data:`, info.data);
        }
      }
    }
  });

  console.log("\n=========================");
  console.log("RESUMEN DEL ARRAY GLOBAL DEVUELTO (con includeResponse: true):");
  console.log("=========================");

  results.forEach((res, i) => {
    const errorSufix = res.isError ? " (Falló - FailSafe capturó el error en la posición del array)" : " (Válido)";
    const hasResponse = res.response ? "Sí" : "No";
    console.log(`-> Petición Num [${i + 1}] terminó reportando un HTTP: ${res.httpCode} | ¿Tiene response?: ${hasResponse} | Datos:`, res.data, errorSufix);
  });

  // NOTA: batch() no soporta enrutar cada item a una URL/método distinto -- url/method/headers/
  // options/timeout siempre son los mismos para todos los items del batch. Si necesitas golpear
  // endpoints distintos por item, usa Promise.all con llamadas individuales:
  //
  // const results2 = await Promise.all([
  //   api.get({ url: "/status/200" }),
  //   api.get({ url: "/status/404" }),
  // ]);
}

run();
