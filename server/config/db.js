const path = require('path');
const useSqlite = process.env.USE_SQLITE === 'true' && !process.env.DATABASE_URL && !process.env.POSTGRES_URL;
const usePg = !useSqlite && (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DB_HOST);

let pool;

if (usePg) {
  let pg;
  try {
    pg = require('./db-pg');
  } catch (e) {
    console.error('PostgreSQL adapter failed to load:', e.message);
    process.exit(1);
  }
  pool = {
    query: pg.query,
    getConnection: pg.getConnection,
  };
  console.log('Using PostgreSQL database');
} else if (useSqlite) {
  let sqlite;
  try {
    sqlite = require('./db-sqlite');
  } catch (e) {
    console.error('SQLite not available. Set DATABASE_URL for PostgreSQL.');
    process.exit(1);
  }
  pool = {
    query: sqlite.query,
    getConnection: sqlite.getConnection,
  };
  console.log('Using SQLite database');
} else {
  console.error('No database configured. Set DATABASE_URL or USE_SQLITE=true');
  process.exit(1);
}

module.exports = pool;
