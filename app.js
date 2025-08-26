// app.js
"use strict";
const path = require("path");
const fs = require("fs");
const oas3Tools = require("oas3-tools");

// En Functions, las rutas cambian. Probamos varias y logueamos.
const ROOT = process.cwd();

const OAS_CANDIDATES = [
  path.join(ROOT, "api", "openapi.yaml"),                  // /var/task/api/openapi.yaml
  path.join(__dirname, "..", "..", "api", "openapi.yaml"), // por si acaso
  path.join(__dirname, "openapi.yaml"),                    // copia junto a la function (plan B)
];

const CTRL_CANDIDATES = [
  path.join(ROOT, "controllers"),                          // /var/task/controllers
  path.join(__dirname, "..", "..", "controllers"),        // por si acaso
];

const OAS_PATH = OAS_CANDIDATES.find(p => fs.existsSync(p));
const CTRL_DIR = CTRL_CANDIDATES.find(p => fs.existsSync(p));

console.log("[OAS candidates]", OAS_CANDIDATES);
console.log("[OAS_PATH found]", OAS_PATH);
console.log("[CTRL candidates]", CTRL_CANDIDATES);
console.log("[CTRL_DIR found]", CTRL_DIR);

if (!OAS_PATH) throw new Error("openapi.yaml no encontrado (incluye api/** en netlify.toml).");
if (!CTRL_DIR) throw new Error("controllers/ no encontrado (incluye controllers/** en netlify.toml).");

const options = { routing: { controllers: CTRL_DIR } };
const expressAppConfig = oas3Tools.expressAppConfig(OAS_PATH, options);
const app = expressAppConfig.getApp();

app.get("/health", (_req, res) => res.status(200).json({ ok: true, oas: OAS_PATH, controllers: CTRL_DIR }));
app.get("/", (_req, res) => res.redirect("/docs"));

module.exports = app;
