// app.js
"use strict";
const path = require("path");
const fs = require("fs");
const oas3Tools = require("oas3-tools");


const ROOT = process.cwd();
const CANDIDATES = [
  path.join(ROOT, "api", "openapi.yaml"),
  path.join(__dirname, "..", "..", "api", "openapi.yaml"),
  path.join(__dirname, "openapi.yaml"),
];

const OAS_PATH = CANDIDATES.find(p => fs.existsSync(p));
console.log("[OAS candidates]", CANDIDATES);
console.log("[OAS_PATH found]", OAS_PATH);

if (!OAS_PATH) {
  throw new Error("openapi.yaml no encontrado. Revisa netlify.toml (included_files) y rutas.");
}

const options = { routing: { controllers: path.join(ROOT, "controllers") } };
const expressAppConfig = oas3Tools.expressAppConfig(OAS_PATH, options);
const app = expressAppConfig.getApp();

app.get("/health", (_req, res) => res.status(200).json({ ok: true, oas: OAS_PATH }));

module.exports = app;
