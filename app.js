// app.js
"use strict";
const path = require("path");
const oas3Tools = require("oas3-tools");

// ¡OJO! En Functions, __dirname cambia. Usa la raíz del deploy:
const ROOT = process.cwd();
const OAS_PATH = path.join(ROOT, "api", "openapi.yaml");

const options = { routing: { controllers: path.join(ROOT, "controllers") } };
const expressAppConfig = oas3Tools.expressAppConfig(OAS_PATH, options);
const app = expressAppConfig.getApp();

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

module.exports = app;
