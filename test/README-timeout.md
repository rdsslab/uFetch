# Timeout Configuration Test Guide

This guide explains how to validate request timeout behavior in `uFetch`, including the default instance timeout, per-request overrides, and timeout overrides inside `batch()` items.

## Example File
- [example-timeout.js](file:///d:/edwinspire/OtrosProyectos/universal-fetch/test/example-timeout.js)

## Core Concepts

### 1. Instance-Level Timeout Defaults
You can configure global timeout behavior for a `uFetch` instance with `setTimeouts()`.
- `timeout` defines the default abort timeout applied to each request.
- `headersTimeout`, `bodyTimeout`, and `socketTimeout` are applied in Node.js through the Undici dispatcher when available.

Example:
```javascript
const client = new uFetch(baseUrl).setTimeouts({
  timeout: 80,
  headersTimeout: 3600000,
});
```

### 2. Per-Request Timeout Overrides
Each request method accepts a `timeout` field in its options object. This value overrides the instance default for that specific request only.

Example:
```javascript
const fastResponse = await client.get({
  url: "/fast?delay=120",
  timeout: 250,
});
```

### 3. Batch Timeout
`batch()` accepts a top-level `timeout` that applies uniformly to every item in the batch — there is no per-item timeout override; all items share the same `url`, `method`, `headers`, `options` and `timeout`.

Example (the first payload's simulated delay exceeds the batch timeout, the second doesn't):
```javascript
const batchResults = await client.batch({
  url: "/batch",
  timeout: 30,
  items: { data: [{ delay: 120 }, { delay: 20 }] },
  config: {
    concurrency: 1,
  },
});
```

## Error Expectations
Timeout failures rethrow the original error object with a normalized English message.

Expected message format:
```text
Request timed out after 80 ms
```

When validating this behavior:
- Assert that the request rejects.
- Assert that `err.message` contains `Request timed out after`.
- For batch results, assert `isError === true` for the timed out item and verify the successful item still resolves correctly.

### AI Agent Guidelines
1. Use a local delayed HTTP server for deterministic timeout checks instead of depending on external services.
2. Keep the default timeout low in the test so the failure path is exercised quickly.
3. Add at least one success case with a larger per-request timeout to confirm that overrides take precedence over the instance default.