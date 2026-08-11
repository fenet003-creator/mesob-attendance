const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'attendance.db');

let db;

function getDbPath() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return DB_PATH;
}

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function translateQuery(sql) {
  let translated = sql;

  // Convert MySQL boolean aggregates: SUM(col = 'val') → SUM(CASE WHEN col = 'val' THEN 1 ELSE 0 END)
  translated = translated.replace(
    /SUM\((\w+)\s*=\s*'([^']+)'\)/g,
    "SUM(CASE WHEN $1 = '$2' THEN 1 ELSE 0 END)"
  );

  // Convert ON DUPLICATE KEY UPDATE to INSERT OR REPLACE (simplified)
  translated = translated.replace(
    /INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*ON DUPLICATE KEY UPDATE\s*(.+)/gi,
    (_match, table, cols, vals, updates) => {
      return `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${vals})`;
    }
  );

  // Convert MySQL AUTO_INCREMENT to SQLite INTEGER PRIMARY KEY
  translated = translated.replace(/INT AUTO_INCREMENT PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT');

  // Remove MySQL-specific syntax
  translated = translated.replace(/ON UPDATE CURRENT_TIMESTAMP/g, '');
  translated = translated.replace(/ENGINE=\w+/g, '');

  // Convert ENUM to TEXT
  translated = translated.replace(/ENUM\([^)]+\)/g, 'TEXT');

  // Convert IF NOT EXISTS (works in SQLite)
  // TIMESTAMP DEFAULT CURRENT_TIMESTAMP (works in SQLite)

  // Remove multipleStatements support markers
  translated = translated.replace(/;\s*$/gm, ';');

  return translated;
}

function initSchema() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'intern',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      university TEXT,
      department TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      profile_photo TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intern_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      attendance_status TEXT NOT NULL DEFAULT 'absent',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
      UNIQUE(intern_id, attendance_date)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS supervisors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      department TEXT,
      specialization TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      head TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      university TEXT,
      department TEXT,
      field_of_study TEXT,
      start_date TEXT,
      end_date TEXT,
      cover_letter TEXT,
      documents TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at TEXT,
      rejection_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS placements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      department_id INTEGER,
      description TEXT,
      requirements TEXT,
      max_interns INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS intern_supervisor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intern_id INTEGER NOT NULL,
      supervisor_id INTEGER NOT NULL,
      assigned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(intern_id, supervisor_id),
      FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
      FOREIGN KEY (supervisor_id) REFERENCES supervisors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS intern_placement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intern_id INTEGER NOT NULL,
      placement_id INTEGER NOT NULL,
      assigned_at TEXT DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE(intern_id, placement_id),
      FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
      FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_audience TEXT NOT NULL DEFAULT 'all',
      priority TEXT NOT NULL DEFAULT 'normal',
      created_by INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Insert default settings
  const upsert = database.prepare(
    'INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)'
  );
  upsert.run('work_start_time', '08:00');
  upsert.run('late_threshold', '08:15');
  upsert.run('absent_threshold', '08:30');

  // Insert default admin if none exists
  const bcrypt = require('bcryptjs');
  const adminCheck = database.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminCheck) {
    const hashed = bcrypt.hashSync('admin123', 10);
    database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashed, 'admin');
    console.log('Default admin created: admin / admin123');
  }

  console.log('SQLite database initialized at:', DB_PATH);
}

// Mimics mysql2/promise pool.query() interface
function query(sql, params = []) {
  const database = getDb();
  let trimmed = sql.trim();

  // Expand array params for IN clauses: IN (?) with array → IN (?, ?, ?)
  let expandedParams = [];
  let pi = 0;
  const expandedSql = trimmed.replace(/\?/g, (match, offset) => {
    const val = params[pi++];
    if (Array.isArray(val)) {
      expandedParams.push(...val);
      return val.map(() => '?').join(', ');
    }
    expandedParams.push(val);
    return '?';
  });

  trimmed = expandedSql;

  // Handle SELECT queries
  if (trimmed.toUpperCase().startsWith('SELECT')) {
    let translated = translateQuery(trimmed);

    // Handle COUNT(*) as separate query
    const stmt = database.prepare(translated);
    const rows = stmt.all(...params);
    return Promise.resolve([rows]);
  }

  // Handle INSERT
  if (trimmed.toUpperCase().startsWith('INSERT')) {
    let translated = translateQuery(trimmed);
    // Remove backticks
    translated = translated.replace(/`/g, '');

    try {
      const stmt = database.prepare(translated);
      const result = stmt.run(...params);
      return Promise.resolve([{ insertId: result.lastInsertRowid, affectedRows: result.changes }]);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Handle UPDATE
  if (trimmed.toUpperCase().startsWith('UPDATE')) {
    let translated = translateQuery(trimmed);
    translated = translated.replace(/`/g, '');

    try {
      const stmt = database.prepare(translated);
      const result = stmt.run(...params);
      return Promise.resolve([{ affectedRows: result.changes }]);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Handle DELETE
  if (trimmed.toUpperCase().startsWith('DELETE')) {
    let translated = translateQuery(trimmed);
    translated = translated.replace(/`/g, '');

    try {
      const stmt = database.prepare(translated);
      const result = stmt.run(...params);
      return Promise.resolve([{ affectedRows: result.changes }]);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Handle CREATE DATABASE, USE, CREATE TABLE, INSERT INTO settings
  try {
    let translated = translateQuery(trimmed);
    translated = translated.replace(/`/g, '');
    // Remove multi-statement and split
    const statements = translated.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        database.exec(stmt);
      }
    }
    return Promise.resolve([]);
  } catch (err) {
    return Promise.reject(err);
  }
}

function getConnection() {
  const database = getDb();
  return Promise.resolve({
    query: (...args) => query(...args),
    beginTransaction: () => {
      database.exec('BEGIN');
      return Promise.resolve();
    },
    commit: () => {
      database.exec('COMMIT');
      return Promise.resolve();
    },
    rollback: () => {
      database.exec('ROLLBACK');
      return Promise.resolve();
    },
    release: () => Promise.resolve(),
    changeUser: ({ database: dbName }) => {
      // SQLite doesn't need this
      return Promise.resolve();
    },
  });
}

module.exports = { query, getConnection, initSchema, getDb };
