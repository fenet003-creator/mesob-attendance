const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateInternInput, validateRequired, validateIntId } = require('../utils/validate');

const router = express.Router();

const isVercel = !!process.env.VERCEL;

const storage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: path.join(__dirname, '../../public/uploads'),
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
      },
    });

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

function getProfilePhotoPath(file) {
  if (!file) return null;
  if (isVercel) return null;
  return `/uploads/${file.filename}`;
}

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { search, department, university, status } = req.query;
    let query = `
      SELECT i.*, u.username
      FROM interns i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (i.full_name LIKE ? OR i.email LIKE ? OR i.university LIKE ? OR i.department LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (department) {
      query += ' AND i.department LIKE ?';
      params.push(`%${department}%`);
    }
    if (university) {
      query += ' AND i.university LIKE ?';
      params.push(`%${university}%`);
    }
    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    query += ' ORDER BY i.full_name ASC';
    const [interns] = await pool.query(query, params);
    res.json(interns);
  } catch (err) {
    console.error('List interns error:', err);
    res.status(500).json({ error: 'Failed to fetch interns' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const internId = req.params.id;
    if (!validateIntId(internId)) {
      return res.status(400).json({ error: 'Invalid intern ID' });
    }

    if (req.user.role === 'intern' && req.user.internId !== parseInt(internId, 10)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [interns] = await pool.query(
      `SELECT i.*, u.username FROM interns i
       LEFT JOIN users u ON i.user_id = u.id WHERE i.id = ?`,
      [internId]
    );

    if (interns.length === 0) {
      return res.status(404).json({ error: 'Intern not found' });
    }

    res.json(interns[0]);
  } catch (err) {
    console.error('Get intern error:', err);
    res.status(500).json({ error: 'Failed to fetch intern' });
  }
});

router.post('/', authenticate, requireRole('admin'), upload.single('profile_photo'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      full_name, email, phone, university, department,
      start_date, end_date, status, username, password,
    } = req.body;

    const requiredErr = validateRequired(['full_name', 'email', 'start_date', 'username', 'password'], req.body);
    if (requiredErr) {
      return res.status(400).json({ error: requiredErr });
    }

    const validationErrors = validateInternInput(req.body, false);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors.join('; ') });
    }

    await connection.beginTransaction();

    const hashedPassword = await bcrypt.hash(password, 10);
    const [userResult] = await connection.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, 'intern']
    );

    const profilePhoto = getProfilePhotoPath(req.file);
    const [internResult] = await connection.query(
      `INSERT INTO interns (user_id, full_name, email, phone, university, department, start_date, end_date, status, profile_photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userResult.insertId, full_name, email, phone || null,
        university || null, department || null, start_date,
        end_date || null, status || 'active', profilePhoto,
      ]
    );

    await connection.commit();
    res.status(201).json({ id: internResult.insertId, message: 'Intern created successfully' });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error('Create intern error:', err);
    res.status(500).json({ error: 'Failed to create intern' });
  } finally {
    connection.release();
  }
});

router.put('/:id', authenticate, requireRole('admin'), upload.single('profile_photo'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid intern ID' });
    }

    const {
      full_name, email, phone, university, department,
      start_date, end_date, status,
    } = req.body;

    const validationErrors = validateInternInput(req.body, true);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors.join('; ') });
    }

    const [existing] = await pool.query('SELECT * FROM interns WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Intern not found' });
    }

    let profilePhoto = existing[0].profile_photo;
    if (req.file && !isVercel) {
      profilePhoto = `/uploads/${req.file.filename}`;
    }

    await pool.query(
      `UPDATE interns SET full_name=?, email=?, phone=?, university=?, department=?,
       start_date=?, end_date=?, status=?, profile_photo=? WHERE id=?`,
      [
        full_name || existing[0].full_name,
        email || existing[0].email,
        phone ?? existing[0].phone,
        university ?? existing[0].university,
        department ?? existing[0].department,
        start_date || existing[0].start_date,
        end_date ?? existing[0].end_date,
        status || existing[0].status,
        profilePhoto,
        req.params.id,
      ]
    );

    res.json({ message: 'Intern updated successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Update intern error:', err);
    res.status(500).json({ error: 'Failed to update intern' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid intern ID' });
    }

    const [interns] = await connection.query('SELECT user_id FROM interns WHERE id = ?', [req.params.id]);
    if (interns.length === 0) {
      return res.status(404).json({ error: 'Intern not found' });
    }

    await connection.beginTransaction();
    await connection.query('DELETE FROM interns WHERE id = ?', [req.params.id]);
    if (interns[0].user_id) {
      await connection.query('DELETE FROM users WHERE id = ?', [interns[0].user_id]);
    }
    await connection.commit();
    res.json({ message: 'Intern deleted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Delete intern error:', err);
    res.status(500).json({ error: 'Failed to delete intern' });
  } finally {
    connection.release();
  }
});

module.exports = router;
