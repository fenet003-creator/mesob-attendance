const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateRequired, validateIntId } = require('../utils/validate');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM departments WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('List departments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.get('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get department error:', err);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, head } = req.body;
    const requiredErr = validateRequired(['name'], req.body);
    if (requiredErr) {
      return res.status(400).json({ error: requiredErr });
    }

    const [result] = await pool.query(
      'INSERT INTO departments (name, description, head) VALUES (?, ?, ?)',
      [name, description || null, head || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Department created successfully' });
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Department name already exists' });
    }
    console.error('Create department error:', err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }
    const { name, description, head, status } = req.body;

    const [existing] = await pool.query('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await pool.query(
      'UPDATE departments SET name=?, description=?, head=?, status=? WHERE id=?',
      [
        name || existing[0].name,
        description ?? existing[0].description,
        head ?? existing[0].head,
        status || existing[0].status,
        req.params.id,
      ]
    );
    res.json({ message: 'Department updated successfully' });
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Department name already exists' });
    }
    console.error('Update department error:', err);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }
    const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error('Delete department error:', err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = router;
