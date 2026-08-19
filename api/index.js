require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

let initialized = false;

async function init() {
  if (initialized) return;
  initialized = true;

  const pool = require('../server/config/db');
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    const { initPgSchema } = require('../server/config/db-pg-init');
    await initPgSchema(pool);
  }
}

const app = require('../server/app');

module.exports = async (req, res) => {
  await init();
  return app(req, res);
};
