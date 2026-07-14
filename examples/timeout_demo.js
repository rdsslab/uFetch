"use strict";

const uFetch = require("../src/fetch");

const client = new uFetch("https://slow-api.example.com").setTimeouts({
  timeout: 3600000,
  headersTimeout: 3600000,
});

client
  .get({
    url: "/resource",
    timeout: 300000,
  })
  .then((response) => response.text())
  .then((body) => {
    console.log("Response:", body);
  })
  .catch((err) => {
    console.error("Error:", err.message, err.code);
  });

/*
Browser (ESM):

import uFetch from "../src/fetch.js";

const browserClient = new uFetch().setAbortTimeout(3600000);

browserClient
  .get({
    url: "/slow-endpoint",
    timeout: 120000,
  })
  .catch((err) => {
    console.error("Error:", err.message, err.code);
  });
*/