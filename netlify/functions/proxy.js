const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const serverless = require('serverless-http');

const app = express();
const netlifyDEV = process.env.NETLIFY_DEV === 'true';

app.use(
  '/',
  createProxyMiddleware({
    target: 'http://dns.tortillagames.org',
    changeOrigin: true,
    secure: false,
    ws: !netlifyDEV,
    onError: (err, req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Something went wrong.');
    },
  })
);

module.exports.handler = serverless(app);
