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
```

### 2. Fail-Safe Parallel Batch Processing
Run a controlled pool of concurrent HTTP requests. It will never crash the overall Promise if a single request fails.

```javascript
const api = new uFetch("https://api.example.com");
const items = [
  { id: 1 }, 
  { id: 2, method: "PUT" }, // Override method for this specific item
  { url: "https://other-api.com/log", data: { msg: "test" } } // Complete override
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

// Response Schema for each item in results:
// { isError: boolean, httpCode: number|null, data?: any, response?: Response, error?: any }
// Note: response object is only included if includeResponse: true is explicitly passed.
```

---

## 📖 Detailed Guides & Examples (AI Agent Oriented)

For complete code examples and detailed guidelines specifically formatted to help AI agents consume the API correctly, see the following guides:

- [GET Requests Guide](file:///d:/edwinspire/OtrosProyectos/universal-fetch/test/README-get.md): Explains query parameter serialization and idempotent reads.
- [POST Requests Guide](file:///d:/edwinspire/OtrosProyectos/universal-fetch/test/README-post.md): Details request body auto-serialization (JSON vs native bodies).
- [PATCH & DELETE Guide](file:///d:/edwinspire/OtrosProyectos/universal-fetch/test/README-patch-delete.md): Explains partial updates and resources deletion.
- [Authentication & Request Cancellation Guide](file:///d:/edwinspire/OtrosProyectos/universal-fetch/test/README-request-abort.md): Demonstrates Bearer tokens, custom request execution, and using `abort()`.
- [Timeout Configuration Test Guide](file:///d:/edwinspire/OtrosProyectos/universal-fetch/test/README-timeout.md): Demonstrates global timeouts, per-request overrides, and batch item timeout overrides.
- [Simple Batch Processing Guide](file:///d:/edwinspire/OtrosProyectos/universal-fetch/test/README-batch-simple.md): Highlights the new single configuration object signature for parallel request batching.
- [Advanced Batch Processing Guide](file:///d:/edwinspire/OtrosProyectos/universal-fetch/test/README-batch.md): Details how to perform concurrent batches with per-item overrides and concurrency limits.

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

Every request shortcut accepts an optional `timeout` field in its options object: `get`, `post`, `put`, `patch`, `delete`, and `batch`.

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
* `data`: Query parameters for `GET`/`HEAD`/`DELETE`, Body for others (when `body` is not defined).
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

#### `get | post | put | patch | delete (opts)`
* Convenience wrappers for `request`. 
* `opts`: `{ url, data, body, headers, options, timeout }`.
  * `data`: Query parameters for `get`/`delete`, request body payload for `post`/`put`/`patch`.
  * `body`: Explicit request body payload (always sent in HTTP body, takes precedence over `data` for the body).
  * `timeout`: Per-request timeout in milliseconds.

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
