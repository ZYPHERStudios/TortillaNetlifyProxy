const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const serverless = require('serverless-http');

const target = 'http://dns.tortillagames.org';
const PORT = process.env.PORT || 3000;

const app = express();

const server = http.createServer(app);

app.use((req, res) => {
  const targetUrl = new URL(req.url, target);
  const options = {
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(targetUrl, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxyReq, { end: true });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.statusCode = 500;
    res.end('Proxy error.');
  });
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const targetWs = new WebSocket(target.replace(/^http/, 'ws'));

  ws.on('message', (message) => {
    targetWs.send(message);
  });

  targetWs.on('message', (message) => {
    ws.send(message);
  });

  ws.on('close', () => {
    targetWs.close();
  });

  targetWs.on('close', () => {
    ws.close();
  });

  targetWs.on('error', (err) => {
    console.error('WebSocket target error:', err);
    ws.close();
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
    targetWs.close();
  });
});

module.exports.handler = serverless(server);