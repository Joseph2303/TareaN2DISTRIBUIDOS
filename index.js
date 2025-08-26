'use strict';
const path = require('path');
const http = require('http');
const oas3Tools = require('oas3-tools');

const serverPort = process.env.PORT || 8080;

const options = { routing: { controllers: path.join(__dirname, './controllers') } };

const expressAppConfig = oas3Tools.expressAppConfig(
  path.join(__dirname, 'api/openapi.yaml'),
  options
);
const app = expressAppConfig.getApp();

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

http.createServer(app).listen(serverPort, () => {
  console.log('Server listening on http://localhost:%d', serverPort);
  console.log('Swagger UI: http://localhost:%d/docs', serverPort);
});
