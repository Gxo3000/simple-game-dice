'use strict'
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

function roll() { return Math.floor(Math.random() * 6) + 1; }
let currentValue = roll();
let nextRollAt = Date.now() + 60000;
const clients = new Set();

function broadcast() {
  const payload = JSON.stringify({ value: currentValue, nextRollAt });
  for (const res of clients) {
    res.write('data: ' + payload + '\n\n');
  }
}

function scheduleNextRoll(delayMs = 60000) {
  clearTimeout(scheduleNextRoll._t);
  nextRollAt = Date.now() + delayMs;
  scheduleNextRoll._t = setTimeout(() => {
    currentValue = roll();
    nextRollAt = Date.now() + 60000;
    broadcast();
    scheduleNextRoll(60000);
  }, delayMs);
}

app.use(express.static(path.join(__dirname)));
app.get('/api/state', (req, res) => res.json({ value: currentValue, nextRollAt }));
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (res.flushHeaders) res.flushHeaders();
  clients.add(res);
  res.write('data: ' + JSON.stringify({ value: currentValue, nextRollAt }) + '\n\n');
  req.on('close', () => { clients.delete(res); });
});
app.use(express.json());
app.post('/api/roll-now', (req, res) => {
  if (scheduleNextRoll._lastManual && Date.now() - scheduleNextRoll._lastManual < 2000) {
    return res.status(429).json({ error: 'Too Many Requests' });
  }
  scheduleNextRoll._lastManual = Date.now();
  currentValue = roll();
  scheduleNextRoll(60000);
  broadcast();
  res.json({ value: currentValue, nextRollAt });
});
app.listen(PORT, () => console.log('Server listening on http://localhost:' + PORT));
scheduleNextRoll(60000);
