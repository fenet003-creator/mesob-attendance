const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateRequired, validateIntId } = require('../utils/validate');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { search, status, department } = req.query;
    let query = `
      SELECT s.*, u.username
      FROM supervisors s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (s.full_name LIKE ? OR s.email LIKE ? OR s.department LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    if (department) {
      query += ' AND s.department LIKE ?';
      params.push(`%${department}%`);
    }

    query += ' ORDER BY s.full_name ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('List supervisors error:', err);
    res.status(500).json({ error: 'Failed to fetch supervisors' });
  }
});

router.get('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supervisor ID' });
    }
    const [rows] = await pool.query(
      'SELECT s.*, u.username FROM supervisors s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get supervisor error:', err);
    res.status(500).json({ error: 'Failed to fetch supervisor' });
  }
});

router.get('/:id/interns', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supervisor ID' });
    }
    const [rows] = await pool.query(
      `SELECT i.*, u.username FROM interns i
       JOIN intern_supervisor isu ON i.id = isu.intern_id
       LEFT JOIN users u ON i.user_id = u.id
       WHERE isu.supervisor_id = ?
       ORDER BY i.full_name ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get supervisor interns error:', err);
    res.status(500).json({ error: 'Failed to fetch assigned interns' });
  }
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { full_name, email, phone, department, specialization, username, password } = req.body;
    const requiredErr = validateRequired(['full_name', 'email', 'username', 'password'], req.body);
    if (requiredErr) {
      return res.status(400).json({ error: requiredErr });
    }

    await connection.beginTransaction();

    const hashedPassword = await bcrypt.hash(password, 10);
    const [userResult] = await connection.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, 'supervisor']
    );

    const [result] = await connection.query(
      `INSERT INTO supervisors (user_id, full_name, email, phone, department, specialization)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userResult.insertId, full_name, email, phone || null, department || null, specialization || null]
    );

    await connection.commit();
    res.status(201).json({ id: result.insertId, message: 'Supervisor created successfully' });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY' || String(err).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error('Create supervisor error:', err);
    res.status(500).json({ error: 'Failed to create supervisor' });
  } finally {
    connection.release();
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supervisor ID' });
    }
    const { full_name, email, phone, department, specialization, status } = req.body;

    const [existing] = await pool.query('SELECT * FROM supervisors WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Supervisor not found' });
    }

    await pool.query(
      `UPDATE supervisors SET full_name=?, email=?, phone=?, department=?, specialization=?, status=?, updated_at=datetime('now') WHERE id=?`,
      [
        full_name || existing[0].full_name,
        email || existing[0].email,
        phone ?? existing[0].phone,
        department ?? existing[0].department,
        specialization ?? existing[0].specialization,
        status || existing[0].status,
        req.params.id,
      ]
    );
    res.json({ message: 'Supervisor updated successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || String(err).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Update supervisor error:', err);
    res.status(500).json({ error: 'Failed to update supervisor' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supervisor ID' });
    }
    const [rows] = await connection.query('SELECT user_id FROM supervisors WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor not found' });
    }

    await connection.beginTransaction();
    await connection.query('DELETE FROM intern_supervisor WHERE supervisor_id = ?', [req.params.id]);
    await connection.query('DELETE FROM supervisors WHERE id = ?', [req.params.id]);
    if (rows[0].user_id) {
      await connection.query('DELETE FROM users WHERE id = ?', [rows[0].user_id]);
    }
    await connection.commit();
    res.json({ message: 'Supervisor deleted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Delete supervisor error:', err);
    res.status(500).json({ error: 'Failed to delete supervisor' });
  } finally {
    connection.release();
  }
});

router.post('/:id/assign', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supervisor ID' });
    }
    const { intern_ids } = req.body;
    if (!Array.isArray(intern_ids) || intern_ids.length === 0) {
      return res.status(400).json({ error: 'intern_ids array is required' });
    }

    for (const internId of intern_ids) {
      if (!validateIntId(internId)) continue;
      await pool.query(
        'INSERT OR IGNORE INTO intern_supervisor (intern_id, supervisor_id) VALUES (?, ?)',
        [internId, req.params.id]
      );
    }
    res.json({ message: 'Interns assigned successfully' });
  } catch (err) {
    console.error('Assign interns error:', err);
    res.status(500).json({ error: 'Failed to assign interns' });
  }
});

router.post('/:id/unassign', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supervisor ID' });
    }
    const { intern_id } = req.body;
    if (!validateIntId(intern_id)) {
      return res.status(400).json({ error: 'Invalid intern ID' });
    }
    await pool.query(
      'DELETE FROM intern_supervisor WHERE intern_id = ? AND supervisor_id = ?',
      [intern_id, req.params.id]
    );
    res.json({ message: 'Intern unassigned successfully' });
  } catch (err) {
    console.error('Unassign intern error:', err);
    res.status(500).json({ error: 'Failed to unassign intern' });
  }
});

module.exports = router;
