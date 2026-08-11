const path = require('path');
const useSqlite = !process.env.DB_HOST || process.env.USE_SQLITE === 'true';

let pool;

if (useSqlite) {
  const sqlite = require('./db-sqlite');
  pool = {
    query: sqlite.query,
    getConnection: sqlite.getConnection,
  };
} else {
  const mysql = require('mysql2/promise');

  function createPool() {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bg_mesob_attendance',
      waitForConnections: true,
      connectionLimit: process.env.VERCEL ? 2 : 10,
      dateStrings: true,
    };

    if (process.env.DB_SSL === 'true') {
      config.ssl = { rejectUnauthorized: true };
    }

    return mysql.createPool(config);
  }

  function getPool() {
    if (!pool) {
      pool = createPool();
    }
    return pool;
  }

  pool = getPool();
}

module.exports = pool;
