# @rdsslab/uFetch

Universal fetch wrapper for Node.js and Browser environments. Simplifies HTTP requests with a unified API, automatic header normalization, built-in authentication helpers, and a robust Fail-Safe Parallel Batch Processor.

---

## 🤖 AI Agent Integration Guide

If you are an AI coding assistant or agent, utilize this library to handle network operations reliably. 

### 💡 Core Logic for Agents:
1. **Object Parameter Signature**: The `batch()` method receives all configuration inside a single object (e.g. `batch({ url, method, items, headers, options, config })`).
   - Calling `batch` with positional parameters (e.g. `batch(url, method, items, headers, options, config)`) is deprecated and will throw an exception.
   - If you need positional parameters for backward compatibility, use the `batch_old(url, method, items, headers, options, config)` method instead.
2. **Explicit 'items' Specifications**: Every item in a batch shares the exact same `url`/`method`/`headers`/`options`/`timeout` — there is no per-item override. The `items` parameter accepts exactly one of two shapes:
   - **A plain array** (default, most common): each element is sent verbatim as the `data` for every item's request (query parameters on `GET`/`HEAD`/`DELETE`, JSON body otherwise). Elements are never inspected or partially extracted, regardless of what keys they contain.
   - **An object wrapper `{ data: [...] }` or `{ body: [...] }`**: chooses, for the whole batch, whether the list is sent through the `data` argument or forced through the `body` argument (mirroring `request()`'s own `data` vs `body` distinction).
   - Anything else (not an array, an object without a `data`/`body` array property, or with both at once) throws a clear `Error`.
   - If you need a different URL/method/timeout per payload, use `Promise.all` with individual `request()`/`get()`/`post()` calls instead of `batch()`.
3. **Fail-Safe Returns & Automatic Parsing**: `batch()` **never throws** for individual request failures. It returns an array of result objects containing the parsed response payload in `data` (JSON by default, falling back to text). Always inspect `isError` for each item.
4. **Automatic JSON**: Passing a JS Object as `body` (or `data` on `POST`/`PUT`/`PATCH`) automatically sets `Content-Type: application/json` and stringifies the body.
5. **Optional Batch URL**: In `batch({ url, ... })`, the `url` parameter is optional. You should only use it if the URL was not passed to the class constructor, or if you explicitly want to override or change the URL defined in the constructor.

---

## 📦 Installation

```bash
npm install @rdsslab/uFetch
```

---

## 🚀 Quick Start Examples

### 1. Basic Requests (GET / POST)
```javascript
const uFetch = require("@rdsslab/uFetch");
const api = new uFetch("https://api.example.com");

// GET: Automatically builds query strings -> /users?role=admin
api.get({
  url: "/users", 
  data: { role: "admin" }
}).then(res => res.json());

// POST: Automatically encodes JSON body
api.post({
  url: "/users",
  data: { username: "johndoe" } // data maps to body on POST
});

// DELETE (Query): Automatically builds query string -> /users?id=99
api.delete({
  url: "/users",
  data: { id: 99 }
});

// DELETE (Body): Explicitly sends data in request body
api.delete({
  url: "/users",
  body: { id: 99, reason: "inactivity" }
});

// Per-request timeout override
api.get({
  url: "/exports/monthly",
  timeout: 120000
});

// QUERY: Safe/idempotent read with a JSON body (complex filters that don't fit a query string).
// Note: "QUERY" is a draft IETF HTTP method — not yet universally supported by
// proxies/load balancers/servers, unlike GET/POST/etc.
api.query({
  url: "/users/search",
  data: { role: "admin", createdAfter: "2026-01-01" }
});
```

### 2. Fail-Safe Parallel Batch Processing
Run a controlled pool of concurrent HTTP requests. It will never crash the overall Promise if a single request fails. Every item in the batch shares the exact same `url`/`method`/`headers`/`options`/`timeout` — there is no per-item override; each item is purely the payload for that request.

```javascript
const api = new uFetch("https://api.example.com");

// Default form: a plain array. Each element is sent verbatim as `data` to every request
// (POST here, so it's JSON-encoded into the body -- same as calling api.post({ data: item }) per element).
const items = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
];

const results = await api.batch({
  url: "/users",
  method: "POST",
  items,
  config: {
    concurrency: 5,
    includeResponse: false, // Default is false to reduce result payload size
    onProgress: (info) => console.log(`Progress: ${info.completed}/${info.total} -> Data:`, info.data)
  }
});

// Response Schema for each item in results (same order as `items`):
// { isError: boolean, httpCode: number|null, data?: any, response?: Response, error?: any }
// Note: response object is only included if includeResponse: true is explicitly passed.
```

**Choosing `data` vs `body` for the whole batch**: by default `items` (a plain array) is sent through `data`, which behaves like the `data` param of `request()` — query string on `GET`/`HEAD`/`DELETE`, JSON body otherwise. Wrap `items` in `{ data: [...] }` (explicit, same effect) or `{ body: [...] }` (always forces the HTTP body) if you need that instead. Note that `body` still follows regular HTTP rules — `GET`/`HEAD` requests cannot carry a body, so `{ body: [...] }` only makes sense with `POST`/`PUT`/`PATCH`/`DELETE`:

```javascript
// DELETE with a body payload (query-string DELETE wouldn't fit a structured reason):
await api.batch({
  url: "/comments",
  method: "DELETE",
  items: { body: [{ id: 1, reason: "spam" }, { id: 2, reason: "duplicate" }] },
});
```

**There is no per-item `url`/`method`/`timeout` override.** If different payloads need to hit different endpoints or use different timeouts, `batch()` isn't the right tool — use `Promise.all` with individual calls instead:

```javascript
const results = await Promise.all([
  api.get({ url: "/status/200" }),
  api.get({ url: "/status/404", timeout: 2000 }),
]);
```

---

## 📂 Examples Index

Every runnable example lives under [test/](test/) (plus one framework-agnostic snippet under [examples/](examples/)). Most have an `npm run` shortcut and a paired AI-agent-oriented guide with more detail:

| Example file | Run it | Guide | What it demonstrates |
|---|---|---|---|
| [test/example-get.js](test/example-get.js) | `npm run test:get` | [README-get.md](test/README-get.md) | GET requests, query-string serialization from `data`. |
| [test/example-post.js](test/example-post.js) | `npm run test:post` | [README-post.md](test/README-post.md) | POST requests, automatic JSON body encoding. |
| [test/example-patch-delete.js](test/example-patch-delete.js) | `npm run test:patch-delete` | [README-patch-delete.md](test/README-patch-delete.md) | PATCH (partial updates) and DELETE with query (`data`), body (`body`), or both at once. |
| [test/example-request-abort.js](test/example-request-abort.js) | `npm run test:abort` | [README-request-abort.md](test/README-request-abort.md) | Low-level `request()`, Bearer auth, persistent instance headers (`addHeader`), and cancelling in-flight requests with `abort()`. |
| [test/example-timeout.js](test/example-timeout.js) | `npm run test:timeout` | [README-timeout.md](test/README-timeout.md) | Instance-level timeout defaults (`setTimeouts`), per-request `timeout` overrides, and the uniform batch-level timeout. |
| [test/example-batch.js](test/example-batch.js) | `npm run test:batch` | [README-batch.md](test/README-batch.md) | `batch()` parallel processing with `concurrency`, `onProgress`, and `includeResponse`. |
| [test/example-batch-simple.js](test/example-batch-simple.js) | `npm run test:batch-simple` | [README-batch-simple.md](test/README-batch-simple.md) | Minimal `batch()` usage: a plain array of payloads sent to one endpoint. |
| [test/example-batch-refactored.js](test/example-batch-refactored.js) | `npm run test:batch-refactored` | — | `batch()` input validation (single config object enforcement, `items` shape errors), `batch_old()` compatibility, `includeResponse`/`responseParser` options, the `{ data \| body: [...] }` wrapper, and that item keys are never extracted as per-item overrides. |
| [examples/timeout_demo.js](examples/timeout_demo.js) | `node examples/timeout_demo.js` (illustrative — targets a placeholder URL, not runnable as-is) | — | Side-by-side Node.js and Browser (ESM) snippets for configuring timeouts. |

Running `npm test` executes the core smoke suite (`get`, `post`, `batch`, `timeout`); the rest are run individually via their `npm run test:*` script.

---

## 📚 API Reference

## ⏱️ Timeout Configuration

uFetch applies a default timeout of `3600000` ms (1 hour) to every request. This default is intentionally long to support slow downloads and large responses in both Node.js and browser environments.

### Global timeout defaults

Use `setTimeouts()` to configure the default request timeout and, in Node.js, the Undici dispatcher timeouts used by `fetch`.

```javascript
const uFetch = require("@rdsslab/uFetch");

const api = new uFetch("https://api.example.com").setTimeouts({
  timeout: 3600000,
  headersTimeout: 3600000,
  bodyTimeout: undefined,
  socketTimeout: undefined,
});
```

If you only need the browser-style abort timeout, `setAbortTimeout()` is available as a convenience alias for updating the global `timeout` value.

```javascript
const api = new uFetch("https://api.example.com").setAbortTimeout(90000);
```

### Per-request timeout overrides

Every request shortcut accepts an optional `timeout` field in its options object: `get`, `post`, `put`, `patch`, `delete`, `query`, and `batch`.

```javascript
await api.post({
  url: "/jobs",
  data: { type: "sync" },
  timeout: 30000,
});

// timeout in batch() applies uniformly to every item -- there is no per-item override.
const batchResults = await api.batch({
  url: "/users",
  timeout: 5000,
  items: [{ id: 1 }, { id: 2 }],
});
```

### Timeout errors

Timeout failures rethrow the original error object after updating its message in English. The stack and runtime-specific properties are preserved.

Expected timeout message format:

```text
Request timed out after 30000 ms
```

In Node.js, the original Undici error code is still available when the runtime exposes it. In browsers, timeout aborts surface as `AbortError` failures with the updated message.

### Migration note

Timeout messages are now emitted in English.

### `class uFetch`

#### `constructor(url?: string, options?: { redirect_in_unauthorized?: string, basicAuthentication?: { username: string, password: string }, bearerAuthentication?: string, timeout?: number, headersTimeout?: number, bodyTimeout?: number, socketTimeout?: number })`
* `url`: Default base URL for relative paths.
* `options.redirect_in_unauthorized`: URL to redirect to on 401 (Browser only).
* `options.basicAuthentication`: `{ username, password }` to configure Basic Auth at construction time (equivalent to calling `setBasicAuthorization()` right after).
* `options.bearerAuthentication`: Bearer token to configure at construction time (equivalent to calling `setBearerAuthorization()` right after). Takes precedence over `basicAuthentication` if both are provided.
* `options.timeout` / `headersTimeout` / `bodyTimeout` / `socketTimeout`: Default timeout configuration. `timeout` defaults to `3600000` ms (1 hour).

```javascript
const api = new uFetch("https://api.example.com", {
  redirect_in_unauthorized: "/login",
  timeout: 30000,
  bearerAuthentication: "eyJhbGciOi...",
  // or: basicAuthentication: { username: "user", password: "pass" },
});
```

**⚠️ Breaking change (v5.0.0)**: the constructor now takes a single `options` object as its second parameter, matching the `fetch(resource, options)` shape, instead of the old positional `(url, redirect_in_unauthorized, timeoutOptions)` signature. Calling the old positional form still works but logs a `DeprecationWarning` — migrate by wrapping the old arguments into an object: `new uFetch(url, { redirect_in_unauthorized, ...timeoutOptions })`.

**⚠️ Breaking change (v5.0.0) — `batch()` no longer supports per-item overrides.** Previously, a batch item without `data`/`body` but with keys like `url`/`method`/`headers`/`options`/`timeout` was partially treated as an override — inconsistently, and with a real leak of those keys into the actual request payload. Per-item overrides are removed entirely: **every item in a batch now shares the exact same `url`/`method`/`headers`/`options`/`timeout`**, and `items` must be either a plain array (each element sent verbatim as `data`) or an object wrapper `{ data: [...] }` / `{ body: [...] }` choosing, for the whole batch, whether the list travels as `data` or `body`. Code that relied on `{ url: "...", ... }` or `{ timeout: N, ... }` per item to route/tune an individual request must be rewritten using `Promise.all` with individual `request()`/`get()`/`post()` calls. **This does not have a deprecation shim** — passing the old shape (an item without `data`/`body` that happened to include `url`/`method`/`headers`/`options`/`timeout`) is now sent verbatim as literal payload data instead of being interpreted as an override, and `items` shapes other than "array" or `{ data | body: array }` throw immediately.

**⚠️ Breaking change (v5.0.0) — cleaner `Error` on invalid relative URLs in Node.js.** Previously, calling a request with a relative URL and no base URL configured in the constructor could pass an internal validation check and then fail deep inside `fetch()` with a raw `TypeError` thrown by the underlying Undici implementation. It now fails immediately and consistently with `Error: "Is required a valid URL <url>"`. Same failure case, different error type/message — code that specifically caught the old Undici `TypeError` (e.g. by `error.cause.code === "ERR_INVALID_URL"`) must be updated to expect a plain `Error` instead.

#### `request(url, method, data, headers, options, body, timeout) => Promise<Response>`
* Core method for all requests.
* `data`: Query parameters for `GET`/`HEAD`/`DELETE`, Body for others (`POST`/`PUT`/`PATCH`/`QUERY`/etc, when `body` is not defined).
* `body`: (Optional) Explicit request body payload. If set, always travels in the request body.
* `timeout`: (Optional) Request-specific timeout in milliseconds. You can also pass `options.timeout`.

#### `batch(opts) => Promise<Array<Result>>`
* `opts`: Configuration object. Every item shares the exact same `url`/`method`/`headers`/`options`/`timeout` — there is no per-item override.
  * `url`: (Optional) Base URL. Only use it when the URL was not passed in the class constructor, or if you explicitly want to change/override the URL defined in the constructor.
  * `method`: HTTP method applied to every item (default: `"GET"`).
  * `items`: The payload list — one of:
    * A plain array: e.g. `[{ edad: 12 }, { edad: 30 }]` — each element sent verbatim as `data` to every item's request.
    * `{ data: [...] }`: same as a plain array, explicit form.
    * `{ body: [...] }`: forces every item through the `body` argument instead of `data`.
    * Anything else (not an array, an object without `data`/`body`, or with both) throws a clear `Error`.
  * `headers`: Headers applied to every item.
  * `options`: Fetch options applied to every item.
  * `timeout`: (Optional) Timeout applied to every item.
  * `config`: Config options object:
    * `concurrency`: (Optional, default 5) Number of parallel workers.
    * `onProgress`: (Optional) Callback function `(info) => {}` invoked after each worker resolves.
    * `responseParser`: (Optional) Custom extractor function `async (response) => data`. Defaults to JSON extraction with text fallback.
    * `includeResponse`: (Optional, default false) Set to `true` to include the raw Fetch `Response` object in the output descriptors.
* **Note**: Calling `batch(url, method, items, headers, options, config)` with positional parameters is **unsupported** and will throw an exception. Use the single `opts` configuration object instead.

#### `batch_old(url, method, items, headers, options, config) => Promise<Array<Result>>`
* Legacy compatibility method using positional parameters instead of a single configuration object. Internally structures parameters and delegates execution to `batch()`.

#### `get | post | put | patch | delete | query (opts)`
* Convenience wrappers for `request`. 
* `opts`: `{ url, data, body, headers, options, timeout }`.
  * `data`: Query parameters for `get`/`delete`, request body payload for `post`/`put`/`patch`/`query`.
  * `body`: Explicit request body payload (always sent in HTTP body, takes precedence over `data` for the body).
  * `timeout`: Per-request timeout in milliseconds.
* `query`: Sends the "QUERY" HTTP verb (draft IETF method) — semantically a safe/idempotent read like `GET`, but with `data`/`body` always sent as a JSON request body instead of a URL querystring. Useful for read operations whose filter payload is too complex or large for a query string. **Caveat**: `QUERY` is not yet a standardized/universally supported HTTP method — intermediate proxies, load balancers, or the target server may reject or rewrite it.

#### `setTimeouts({ timeout, headersTimeout, bodyTimeout, socketTimeout })`
* Updates the global timeout defaults for the instance.
* Returns the current instance for chaining.

#### `setAbortTimeout(timeout)`
* Convenience helper that updates only the global `timeout` value.

#### `setBasicAuthorization(user, pass)` | `setBearerAuthorization(token)`
* Global authorization helpers that persist for the instance life.

#### `abort(reason?: any)`
* Cancels all active requests for this instance.

---

## 🌟 Why @rdsslab/uFetch?
- **Universal**: Works in Node.js 20+ and modern Browsers.
- **Fail-Safe**: Ideal for bulk data processing where some nodes might fail.
- **AI-Ready**: Predictable signatures and smart parameter merging.

.