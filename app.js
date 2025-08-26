// app.js
"use strict";
const path = require("path");
const oas3Tools = require("oas3-tools");

const options = { routing: { controllers: path.join(__dirname, "./controllers") } };
const expressAppConfig = oas3Tools.expressAppConfig(
  path.join(__dirname, "api/openapi.yaml"),
  options
);
const app = expressAppConfig.getApp();

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

module.exports = app;
