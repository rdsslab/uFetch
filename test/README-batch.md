# Advanced Batch Processing Example Guide

This guide explains how to use the advanced parallel batch processing features of `uFetch`, specifically handling base parameter overrides for individual items in a batch.

## Example File
- [example-batch.js](file:///d:/edwinspire/OtrosProyectos/universal-fetch/test/example-batch.js)

## Core Concept
When calling `batch()`, every item in the batch shares the exact same `url`, `method`, `headers`, `options` and `timeout` — there is no per-item override. The base `url` parameter is completely **optional**; it should only be supplied if no base URL was passed to the class constructor, or if you explicitly want to change/override the URL defined in the constructor.

The `items` parameter accepts exactly one of two shapes:
- **A plain array** (default, most common): each element is sent verbatim as the request `data` for every item (query parameters on `GET`/`HEAD`/`DELETE`, JSON body otherwise) — the same as calling `request(url, method, element, headers, options, undefined, timeout)` for each element. Elements are never inspected or partially extracted, regardless of what keys they contain.
- **An object wrapper `{ data: [...] }` or `{ body: [...] }`**: chooses, for the whole batch, whether the list is sent through the `data` argument or forced through the `body` argument (mirroring `request()`'s own `data` vs `body` distinction). Each element inside the array is still sent verbatim.

If you need a different URL, method or timeout for a specific payload, `batch()` is not the right tool — use `Promise.all` with individual `request()`/`get()`/`post()` calls instead.

### AI Agent Guidelines
1. **`items` shape**:
   - Plain array → sent as `data` to every item's request.
   - `{ data: [...] }` → same as a plain array, explicit form.
   - `{ body: [...] }` → forces every item through the `body` argument instead of `data`.
   - Anything else (not an array, or an object without a `data`/`body` array property, or with both at once) throws a clear `Error`.
1a. **Positional Arguments Restriction**: Positional parameters are unsupported in `batch()` and will throw an exception. Always wrap options inside a single configuration object. If positional parameters are strictly required for legacy integration, use the `batch_old()` method instead.
2. **Execution**:
   ```javascript
   const results = await api.batch({
     url: "/get",
     method: "GET",
     items: [{ id: 1 }, { id: 2 }, { id: 3 }],
     config: {
       concurrency: 3,
       onProgress: (info) => {
         console.log(`[Progress]: ${info.completed}/${info.total}`);
       }
     }
   });
   ```

## Fail-Safe Approach & Automatic Parsing
The batch mechanism is designed to handle network errors, timeouts, or bad HTTP status codes without failing the outer Promise:
- If a request fails or throws, its index in the output array will have `isError: true` and `error` populated.
- Other requests in the batch will continue running normally.
- **Automatic Deserialization**: Response bodies are automatically parsed (JSON by default, with a fallback to raw text) and saved in the `data` property of each result item.
- **Custom Parsing**: You can provide a custom extraction logic using `config.responseParser: async (response) => data`.
- **Response footprint reduction**: By default, the heavy `response` object is omitted from results. If you need it, set `config.includeResponse: true`.

This is extremely valuable for AI Agents processing bulk actions (e.g. updating 100 database records) where you do not want a single error to abort the entire operation and want direct access to the parsed output data.
