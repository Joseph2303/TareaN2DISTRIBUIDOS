// netlify/functions/api.js
const serverless = require("serverless-http");
const app = require("../../app");   // sube 2 niveles hasta la raíz y carga app.js
module.exports.handler = serverless(app);
