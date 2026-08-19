const bcrypt = require('bcryptjs');

async function initPgSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'intern',
      created_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc')
    );

    CREATE TABLE IF NOT EXISTS interns (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      university TEXT,
      department TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      profile_photo TEXT,
      created_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc'),
      updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc')
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      intern_id INTEGER NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
      attendance_date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      attendance_status TEXT NOT NULL DEFAULT 'absent',
      created_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc'),
      updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc'),
      UNIQUE(intern_id, attendance_date)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS supervisors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      department TEXT,
      specialization TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc'),
      updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc')
    );

    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      head TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc')
    );

    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
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
      created_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc'),
      updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc')
    );

    CREATE TABLE IF NOT EXISTS placements (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      description TEXT,
      requirements TEXT,
      max_interns INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc'),
      updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc')
    );

    CREATE TABLE IF NOT EXISTS intern_supervisor (
      id SERIAL PRIMARY KEY,
      intern_id INTEGER NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
      supervisor_id INTEGER NOT NULL REFERENCES supervisors(id) ON DELETE CASCADE,
      assigned_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc'),
      UNIQUE(intern_id, supervisor_id)
    );

    CREATE TABLE IF NOT EXISTS intern_placement (
      id SERIAL PRIMARY KEY,
      intern_id INTEGER NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
      placement_id INTEGER NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
      assigned_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc'),
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE(intern_id, placement_id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_audience TEXT NOT NULL DEFAULT 'all',
      priority TEXT NOT NULL DEFAULT 'normal',
      created_by INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc'),
      updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc')
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc')
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (NOW() AT TIME ZONE 'utc')
    );
  `);

  // Default settings
  const [settingCheck] = await pool.query("SELECT COUNT(*) as cnt FROM settings");
  if (parseInt(settingCheck[0].cnt) === 0) {
    await pool.query("INSERT INTO settings (setting_key, setting_value) VALUES ('work_start_time', '08:00')");
    await pool.query("INSERT INTO settings (setting_key, setting_value) VALUES ('late_threshold', '08:15')");
    await pool.query("INSERT INTO settings (setting_key, setting_value) VALUES ('absent_threshold', '08:30')");
  }

  // Default admin
  const [adminCheck] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (adminCheck.length === 0) {
    const hashed = bcrypt.hashSync('admin123', 10);
    await pool.query("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashed, 'admin']);
    console.log('Default admin created: admin / admin123');
  }

  await seedSampleData(pool, bcrypt);
}

async function seedSampleData(pool, bcrypt) {
  const [hasInterns] = await pool.query('SELECT COUNT(*) as cnt FROM interns');
  if (parseInt(hasInterns[0].cnt) > 0) return;

  console.log('Seeding sample data...');
  const today = new Date().toISOString().slice(0, 10);

  const [adminRows] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  const adminId = adminRows[0] ? adminRows[0].id : null;

  // Departments
  const depts = [
    ['Software Engineering', 'Web and mobile application development', 'Dr. Abebe Kebede'],
    ['Data Science', 'Data analytics, machine learning, and AI research', 'Dr. Sara Tadesse'],
    ['Quality Assurance', 'Software testing and quality control', 'Eng. Daniel Mamo'],
    ['DevOps', 'Infrastructure, CI/CD, and cloud operations', 'Eng. Fatima Ahmed'],
  ];
  for (const [name, desc, head] of depts) {
    await pool.query('INSERT INTO departments (name, description, head) VALUES (?, ?, ?)', [name, desc, head]);
  }

  // Supervisors
  const hashedSup = bcrypt.hashSync('supervisor123', 10);
  const sups = [
    ['abebe_k', 'Dr. Abebe Kebede', 'abebe@mesob.et', '+251911111111', 'Software Engineering', 'Full-Stack Development'],
    ['sara_t', 'Dr. Sara Tadesse', 'sara@mesob.et', '+251922222222', 'Data Science', 'Machine Learning'],
  ];
  for (const [username, name, email, phone, dept, spec] of sups) {
    const [ur] = await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?) RETURNING id', [username, hashedSup, 'supervisor']);
    await pool.query('INSERT INTO supervisors (user_id, full_name, email, phone, department, specialization) VALUES (?, ?, ?, ?, ?, ?)',
      [ur.insertId, name, email, phone, dept, spec]);
  }

  // Interns
  const hashedIntern = bcrypt.hashSync('intern123', 10);
  const internData = [
    ['hana_t', 'Hana Tesfaye', 'hana@addis.ababa.edu', '+251911001001', 'Addis Ababa University', 'Software Engineering'],
    ['biruk_a', 'Biruk Alemayehu', 'biruk@st.uoguelph.edu', '+251911002002', 'Bahir Dar University', 'Data Science'],
    ['meskerem_g', 'Meskerem Girma', 'meskerem@aau.edu.et', '+251911003003', 'Jimma University', 'Quality Assurance'],
    ['yonas_b', 'Yonas Bekele', 'yonas@aicte.edu', '+251911004004', 'Hawassa University', 'Software Engineering'],
    ['ruth_d', 'Ruth Damtew', 'ruth@aau.edu.et', '+251911005005', 'Addis Ababa University', 'DevOps'],
  ];
  const internIds = [];
  const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  for (const [username, name, email, phone, uni, dept] of internData) {
    const [ur] = await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?) RETURNING id', [username, hashedIntern, 'intern']);
    const [ir] = await pool.query(
      'INSERT INTO interns (user_id, full_name, email, phone, university, department, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [ur.insertId, name, email, phone, uni, dept, startDate, endDate, 'active']
    );
    internIds.push(ir.insertId);
  }

  // Attendance (last 5 working days)
  const statuses = ['present', 'present', 'present', 'late', 'absent', 'present', 'late'];
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date(Date.now() - dayOffset * 86400000);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().slice(0, 10);
    for (let j = 0; j < internIds.length; j++) {
      const status = statuses[(dayOffset + j) % statuses.length];
      let checkIn = null, checkOut = null;
      if (status === 'present') { checkIn = '08:05:00'; checkOut = '17:00:00'; }
      else if (status === 'late') { checkIn = '08:20:00'; checkOut = '17:00:00'; }
      await pool.query(
        'INSERT INTO attendance (intern_id, attendance_date, check_in, check_out, attendance_status) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
        [internIds[j], dateStr, checkIn, checkOut, status]
      );
    }
  }

  // Placements
  const placements = [
    ['Frontend Developer Intern', 1, 'Build responsive web interfaces', 'React, HTML/CSS, JavaScript', 2],
    ['Data Analyst Intern', 2, 'Analyze datasets and build dashboards', 'Python, SQL, statistics', 1],
    ['QA Tester Intern', 3, 'Test web applications and write reports', 'Attention to detail, testing basics', 1],
  ];
  for (const [title, deptId, desc, reqs, maxI] of placements) {
    await pool.query(
      'INSERT INTO placements (title, department_id, description, requirements, max_interns, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, deptId, desc, reqs, maxI, today, 'open']
    );
  }

  // Applications
  const apps = [
    ['Dawit Lemma', 'dawit@aau.edu.et', '+251911006006', 'Addis Ababa University', 'Software Engineering', 'Computer Science', 'I am passionate about web development.', 'pending'],
    ['Tigist Haile', 'tigist@bdu.edu.et', '+251911007007', 'Bahir Dar University', 'Data Science', 'Statistics', 'Strong analytical skills with Python.', 'pending'],
    ['Samuel Fisseha', 'samuel@hu.edu.et', '+251911008008', 'Hawassa University', 'Software Engineering', 'Software Engineering', 'Eager to apply software skills professionally.', 'approved'],
  ];
  for (const [name, email, phone, uni, dept, fos, cover, status] of apps) {
    await pool.query(
      'INSERT INTO applications (applicant_name, email, phone, university, department, field_of_study, start_date, cover_letter, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, uni, dept, fos, today, cover, status]
    );
  }

  // Announcements
  await pool.query(
    'INSERT INTO announcements (title, content, target_audience, priority, created_by) VALUES (?, ?, ?, ?, ?)',
    ['Welcome to BG Mesob Internship Program', 'We are excited to have you join our team! Please complete your onboarding by the end of this week.', 'all', 'high', adminId]
  );
  await pool.query(
    'INSERT INTO announcements (title, content, target_audience, priority, created_by) VALUES (?, ?, ?, ?, ?)',
    ['Weekly Standup Meeting', 'Every Monday at 9:00 AM we have a team standup. Attendance is mandatory for all interns.', 'interns', 'normal', adminId]
  );

  // Audit log
  await pool.query(
    'INSERT INTO audit_logs (user_id, username, action, entity_type, details) VALUES (?, ?, ?, ?, ?)',
    [adminId, 'system', 'seed_data', 'system', 'Sample data seeded for demonstration']
  );

  console.log('Sample data seeded successfully');
}

module.exports = { initPgSchema };
