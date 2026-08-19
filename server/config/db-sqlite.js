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

  seedSampleData(database, bcrypt);

  console.log('SQLite database initialized at:', DB_PATH);
}

function seedSampleData(database, bcrypt) {
  const hasInterns = database.prepare('SELECT COUNT(*) as cnt FROM interns').get();
  if (hasInterns.cnt > 0) return;

  console.log('Seeding sample data...');

  const adminUser = database.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  const today = new Date().toISOString().slice(0, 10);

  const departments = [
    { name: 'Software Engineering', description: 'Web and mobile application development', head: 'Dr. Abebe Kebede' },
    { name: 'Data Science', description: 'Data analytics, machine learning, and AI research', head: 'Dr. Sara Tadesse' },
    { name: 'Quality Assurance', description: 'Software testing and quality control', head: 'Eng. Daniel Mamo' },
    { name: 'DevOps', description: 'Infrastructure, CI/CD, and cloud operations', head: 'Eng. Fatima Ahmed' },
  ];
  const insertDept = database.prepare('INSERT INTO departments (name, description, head) VALUES (?, ?, ?)');
  for (const d of departments) insertDept.run(d.name, d.description, d.head);

  const supervisors = [
    { full_name: 'Dr. Abebe Kebede', email: 'abebe@mesob.et', phone: '+251911111111', department: 'Software Engineering', specialization: 'Full-Stack Development', username: 'abebe_k' },
    { full_name: 'Dr. Sara Tadesse', email: 'sara@mesob.et', phone: '+251922222222', department: 'Data Science', specialization: 'Machine Learning', username: 'sara_t' },
  ];
  const hashedSup = bcrypt.hashSync('supervisor123', 10);
  const insertUser = database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
  const insertSupervisor = database.prepare('INSERT INTO supervisors (user_id, full_name, email, phone, department, specialization) VALUES (?, ?, ?, ?, ?, ?)');
  for (const s of supervisors) {
    const ur = insertUser.run(s.username, hashedSup, 'supervisor');
    insertSupervisor.run(ur.lastInsertRowid, s.full_name, s.email, s.phone, s.department, s.specialization);
  }

  const internData = [
    { full_name: 'Hana Tesfaye', email: 'hana@addis.ababa.edu', phone: '+251911001001', university: 'Addis Ababa University', department: 'Software Engineering', username: 'hana_t' },
    { full_name: 'Biruk Alemayehu', email: 'biruk@st.uoguelph.edu', phone: '+251911002002', university: 'Bahir Dar University', department: 'Data Science', username: 'biruk_a' },
    { full_name: 'Meskerem Girma', email: 'meskerem@aau.edu.et', phone: '+251911003003', university: 'Jimma University', department: 'Quality Assurance', username: 'meskerem_g' },
    { full_name: 'Yonas Bekele', email: 'yonas@aicte.edu', phone: '+251911004004', university: 'Hawassa University', department: 'Software Engineering', username: 'yonas_b' },
    { full_name: 'Ruth Damtew', email: 'ruth@aau.edu.et', phone: '+251911005005', university: 'Addis Ababa University', department: 'DevOps', username: 'ruth_d' },
  ];
  const hashedIntern = bcrypt.hashSync('intern123', 10);
  const insertIntern = database.prepare(
    'INSERT INTO interns (user_id, full_name, email, phone, university, department, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const internIds = [];
  for (const i of internData) {
    const ur = insertUser.run(i.username, hashedIntern, 'intern');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 60);
    const ir = insertIntern.run(ur.lastInsertRowid, i.full_name, i.email, i.phone, i.university, i.department, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10), 'active');
    internIds.push(ir.lastInsertRowid);
  }

  const insertAttend = database.prepare(
    'INSERT OR IGNORE INTO attendance (intern_id, attendance_date, check_in, check_out, attendance_status) VALUES (?, ?, ?, ?, ?)'
  );
  const statuses = ['present', 'present', 'present', 'late', 'absent', 'present', 'late'];
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().slice(0, 10);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend) continue;

    for (let j = 0; j < internIds.length; j++) {
      const status = statuses[(dayOffset + j) % statuses.length];
      let checkIn = null;
      let checkOut = null;
      if (status === 'present') {
        checkIn = '08:05:00';
        checkOut = '17:00:00';
      } else if (status === 'late') {
        checkIn = '08:20:00';
        checkOut = '17:00:00';
      }
      insertAttend.run(internIds[j], dateStr, checkIn, checkOut, status);
    }
  }

  const placements = [
    { title: 'Frontend Developer Intern', department_id: 1, description: 'Build responsive web interfaces for our client portal', requirements: 'React, HTML/CSS, JavaScript', max_interns: 2, status: 'open' },
    { title: 'Data Analyst Intern', department_id: 2, description: 'Analyze datasets and build dashboards for business insights', requirements: 'Python, SQL, statistics basics', max_interns: 1, status: 'open' },
    { title: 'QA Tester Intern', department_id: 3, description: 'Test web applications and write test reports', requirements: 'Attention to detail, basic testing knowledge', max_interns: 1, status: 'open' },
  ];
  const insertPlacement = database.prepare(
    'INSERT INTO placements (title, department_id, description, requirements, max_interns, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const p of placements) {
    insertPlacement.run(p.title, p.department_id, p.description, p.requirements, p.max_interns, today, null, p.status);
  }

  const insertApp = database.prepare(
    'INSERT INTO applications (applicant_name, email, phone, university, department, field_of_study, start_date, end_date, cover_letter, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insertApp.run('Dawit Lemma', 'dawit@aau.edu.et', '+251911006006', 'Addis Ababa University', 'Software Engineering', 'Computer Science', today, null, 'I am passionate about web development and want to contribute to meaningful projects.', 'pending');
  insertApp.run('Tigist Haile', 'tigist@bdu.edu.et', '+251911007007', 'Bahir Dar University', 'Data Science', 'Statistics', today, null, 'I have strong analytical skills and experience with Python data libraries.', 'pending');
  insertApp.run('Samuel Fisseha', 'samuel@hu.edu.et', '+251911008008', 'Hawassa University', 'Software Engineering', 'Software Engineering', today, null, 'Looking for an opportunity to apply my software skills in a professional environment.', 'approved');

  database.prepare('INSERT INTO announcements (title, content, target_audience, priority, created_by) VALUES (?, ?, ?, ?, ?)').run(
    'Welcome to BG Mesob Internship Program',
    'We are excited to have you join our team! Please complete your onboarding by the end of this week. Check your email for details.',
    'all', 'high', adminUser ? adminUser.id : null
  );
  database.prepare('INSERT INTO announcements (title, content, target_audience, priority, created_by) VALUES (?, ?, ?, ?, ?)').run(
    'Weekly Standup Meeting',
    'Every Monday at 9:00 AM we have a team standup. Attendance is mandatory for all interns.',
    'interns', 'normal', adminUser ? adminUser.id : null
  );

  database.prepare('INSERT INTO audit_logs (user_id, username, action, entity_type, details) VALUES (?, ?, ?, ?, ?)').run(
    adminUser ? adminUser.id : null, 'system', 'seed_data', 'system', 'Sample data seeded for demonstration'
  );

  console.log('Sample data seeded successfully');
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
