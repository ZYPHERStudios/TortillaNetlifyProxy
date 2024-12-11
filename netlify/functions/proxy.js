const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const target = 'http://dns.tortillagames.org'; // Target server
const PORT = process.env.PORT || 3000;

// Create an Express app
const app = express();

// Create an HTTP server
const server = http.createServer(app);

// HTTP proxy
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

// WebSocket proxy
const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const targetWs = new WebSocket(target.replace(/^http/, 'ws')); // Convert target to WS

  // Forward messages from client to target
  ws.on('message', (message) => {
    targetWs.send(message);
  });

  // Forward messages from target to client
  targetWs.on('message', (message) => {
    ws.send(message);
  });

  // Handle client disconnection
  ws.on('close', () => {
    targetWs.close();
  });

  // Handle target disconnection
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