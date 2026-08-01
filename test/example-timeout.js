"use strict";

const assert = require("assert/strict");
const http = require("http");

const uFetch = require("../src/fetch");

const listen = (server) =>
  new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, () => {
      resolve(server.address().port);
    });
  });

const close = (server) =>
  new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const delay = Number(url.searchParams.get("delay") || 0);

  setTimeout(() => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, delay }));
  }, delay);
});

(async () => {
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  const client = new uFetch(baseUrl).setTimeouts({
    timeout: 80,
    headersTimeout: 3600000,
  });

  assert.ok(client._undiciDispatcher === undefined || typeof client._undiciDispatcher.dispatch === "function");

  await assert.rejects(
    client.get({
      url: "/slow?delay=120",
    }),
    (err) => {
      assert.match(err.message, /Request timed out after 80 ms/);
      return true;
    }
  );

  const fastResponse = await client.get({
    url: "/fast?delay=120",
    timeout: 250,
  });

  assert.equal(fastResponse.status, 200);

  const batchResults = await client.batch({
    url: "/batch",
    timeout: 60,
    items: { data: [{ delay: 200 }, { delay: 5 }] },
    config: {
      concurrency: 1,
    },
  });

  assert.equal(batchResults[0].isError, true);
  assert.match(batchResults[0].error.message, /Request timed out after 60 ms/);
  assert.equal(batchResults[1].isError, false);
  assert.deepEqual(batchResults[1].data, { ok: true, delay: 5 });

  await close(server);
  console.log("Timeout tests passed");
})().catch(async (err) => {
  console.error(err);

  try {
    await close(server);
  } catch (closeErr) {
    console.error(closeErr);
  }

  process.exitCode = 1;
});