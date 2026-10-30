const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jobRoutes = require('./routes/jobRoutes');
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8088').split(',').map(value => value.trim()) }));
app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'unavailable', database: connected ? 'connected' : 'disconnected' });
});
app.use('/api/jobs', (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'The database is unavailable. Please try again shortly.' });
  next();
}, jobRoutes);
app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use((error, _req, res, _next) => {
  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error('Request failed:', error.name);
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : error.message });
});
module.exports = app;
