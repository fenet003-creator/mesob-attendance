require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await connection.query(schema);

  const dbName = process.env.DB_NAME || 'bg_mesob_attendance';
  await connection.changeUser({ database: dbName });

  const [admins] = await connection.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );

  if (admins.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['admin', hashedPassword, 'admin']
    );
    console.log('Default admin created: username=admin, password=admin123');
  }

  await connection.end();
  console.log('Database initialized successfully.');
}

initDatabase().catch((err) => {
  console.error('Database initialization failed:', err.message);
  process.exit(1);
});
