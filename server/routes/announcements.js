const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateRequired, validateIntId } = require('../utils/validate');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { search, target_audience, is_active } = req.query;
    let query = 'SELECT * FROM announcements WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }
    if (target_audience) {
      query += ' AND target_audience = ?';
      params.push(target_audience);
    }
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('List announcements error:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get announcement error:', err);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { title, content, target_audience, priority } = req.body;
    const requiredErr = validateRequired(['title', 'content'], req.body);
    if (requiredErr) {
      return res.status(400).json({ error: requiredErr });
    }

    const [result] = await pool.query(
      'INSERT INTO announcements (title, content, target_audience, priority, created_by) VALUES (?, ?, ?, ?, ?)',
      [title, content, target_audience || 'all', priority || 'normal', req.user.id]
    );

    // Create notifications for targeted users
    let userQuery = 'SELECT id FROM users WHERE 1=1';
    const notifParams = [];
    if (target_audience === 'interns') {
      userQuery += " AND role = 'intern'";
    } else if (target_audience === 'supervisors') {
      userQuery += " AND role = 'supervisor'";
    }

    const [users] = await pool.query(userQuery, notifParams);
    for (const u of users) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
        [u.id, title, content.substring(0, 200), 'announcement', `/announcements/${result.insertId}`]
      );
    }

    res.status(201).json({ id: result.insertId, message: 'Announcement created successfully' });
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }
    const { title, content, target_audience, priority, is_active } = req.body;

    const [existing] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await pool.query(
      `UPDATE announcements SET title=?, content=?, target_audience=?, priority=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
      [
        title || existing[0].title,
        content || existing[0].content,
        target_audience || existing[0].target_audience,
        priority || existing[0].priority,
        is_active !== undefined ? (is_active ? 1 : 0) : existing[0].is_active,
        req.params.id,
      ]
    );
    res.json({ message: 'Announcement updated successfully' });
  } catch (err) {
    console.error('Update announcement error:', err);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }
    const [result] = await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('Delete announcement error:', err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

module.exports = router;
