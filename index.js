// app.js
"use strict";
const path = require("path");
const fs = require("fs");
const oas3Tools = require("oas3-tools");

const ROOT = process.cwd();
const OAS_PATH = [path.join(ROOT,"api","openapi.yaml"), path.join(__dirname,"..","..","api","openapi.yaml")].find(p=>fs.existsSync(p));

const options = { routing: { controllers: path.join(ROOT, "controllers") } };
const expressAppConfig = oas3Tools.expressAppConfig(OAS_PATH, options);
const app = expressAppConfig.getApp();

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// 👇 nuevo: manda la raíz a /docs
app.get("/", (_req, res) => res.redirect("/docs"));

module.exports = app;
