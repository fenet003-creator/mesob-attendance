require('dotenv').config();
const express = require('express');
const path = require('path');
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize SQLite if no MySQL is configured
async function start() {
  if (!process.env.DB_HOST || process.env.USE_SQLITE === 'true') {
    console.log('Using SQLite database (local dev mode)');
    const { initSchema } = require('./config/db-sqlite');
    initSchema();
  } else {
    console.log('Using MySQL at', process.env.DB_HOST);
  }

  app.listen(PORT, () => {
    console.log(`BG Mesob Attendance System running at http://localhost:${PORT}`);
  });
}

start();
