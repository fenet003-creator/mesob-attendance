const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateRequired, validateIntId } = require('../utils/validate');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { search, status, department_id } = req.query;
    let query = `
      SELECT p.*, d.name as department_name,
        (SELECT COUNT(*) FROM intern_placement ip WHERE ip.placement_id = p.id AND ip.status = 'active') as assigned_count
      FROM placements p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (department_id) {
      query += ' AND p.department_id = ?';
      params.push(department_id);
    }

    query += ' ORDER BY p.created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('List placements error:', err);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

router.get('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid placement ID' });
    }
    const [rows] = await pool.query(
      `SELECT p.*, d.name as department_name FROM placements p
       LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get placement error:', err);
    res.status(500).json({ error: 'Failed to fetch placement' });
  }
});

router.get('/:id/interns', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid placement ID' });
    }
    const [rows] = await pool.query(
      `SELECT i.*, u.username FROM interns i
       JOIN intern_placement ip ON i.id = ip.intern_id
       LEFT JOIN users u ON i.user_id = u.id
       WHERE ip.placement_id = ? AND ip.status = 'active'
       ORDER BY i.full_name ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get placement interns error:', err);
    res.status(500).json({ error: 'Failed to fetch assigned interns' });
  }
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { title, department_id, description, requirements, max_interns, start_date, end_date } = req.body;
    const requiredErr = validateRequired(['title'], req.body);
    if (requiredErr) {
      return res.status(400).json({ error: requiredErr });
    }

    const [result] = await pool.query(
      `INSERT INTO placements (title, department_id, description, requirements, max_interns, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, department_id || null, description || null, requirements || null, max_interns || 1, start_date || null, end_date || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Placement created successfully' });
  } catch (err) {
    console.error('Create placement error:', err);
    res.status(500).json({ error: 'Failed to create placement' });
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid placement ID' });
    }
    const { title, department_id, description, requirements, max_interns, start_date, end_date, status } = req.body;

    const [existing] = await pool.query('SELECT * FROM placements WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    await pool.query(
      `UPDATE placements SET title=?, department_id=?, description=?, requirements=?, max_interns=?, start_date=?, end_date=?, status=?, updated_at=datetime('now') WHERE id=?`,
      [
        title || existing[0].title,
        department_id ?? existing[0].department_id,
        description ?? existing[0].description,
        requirements ?? existing[0].requirements,
        max_interns ?? existing[0].max_interns,
        start_date ?? existing[0].start_date,
        end_date ?? existing[0].end_date,
        status || existing[0].status,
        req.params.id,
      ]
    );
    res.json({ message: 'Placement updated successfully' });
  } catch (err) {
    console.error('Update placement error:', err);
    res.status(500).json({ error: 'Failed to update placement' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid placement ID' });
    }
    await pool.query('DELETE FROM intern_placement WHERE placement_id = ?', [req.params.id]);
    const [result] = await pool.query('DELETE FROM placements WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }
    res.json({ message: 'Placement deleted' });
  } catch (err) {
    console.error('Delete placement error:', err);
    res.status(500).json({ error: 'Failed to delete placement' });
  }
});

router.post('/:id/assign', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid placement ID' });
    }
    const { intern_ids } = req.body;
    if (!Array.isArray(intern_ids) || intern_ids.length === 0) {
      return res.status(400).json({ error: 'intern_ids array is required' });
    }

    const [placement] = await pool.query('SELECT max_interns FROM placements WHERE id = ?', [req.params.id]);
    if (placement.length === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    const [current] = await pool.query(
      'SELECT COUNT(*) as cnt FROM intern_placement WHERE placement_id = ? AND status = ?',
      [req.params.id, 'active']
    );
    const available = placement[0].max_interns - current[0].cnt;
    if (intern_ids.length > available) {
      return res.status(400).json({ error: `Only ${available} spot(s) remaining` });
    }

    for (const internId of intern_ids) {
      if (!validateIntId(internId)) continue;
      await pool.query(
        'INSERT OR IGNORE INTO intern_placement (intern_id, placement_id) VALUES (?, ?)',
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
      return res.status(400).json({ error: 'Invalid placement ID' });
    }
    const { intern_id } = req.body;
    if (!validateIntId(intern_id)) {
      return res.status(400).json({ error: 'Invalid intern ID' });
    }
    await pool.query(
      'UPDATE intern_placement SET status = ? WHERE intern_id = ? AND placement_id = ?',
      ['completed', intern_id, req.params.id]
    );
    res.json({ message: 'Intern unassigned successfully' });
  } catch (err) {
    console.error('Unassign intern error:', err);
    res.status(500).json({ error: 'Failed to unassign intern' });
  }
});

module.exports = router;
