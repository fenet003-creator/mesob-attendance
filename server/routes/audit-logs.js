const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { action, entity_type, user_id, start_date, end_date, limit } = req.query;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (entity_type) {
      query += ' AND entity_type = ?';
      params.push(entity_type);
    }
    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }
    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date + ' 23:59:59');
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit) || 200);

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('List audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Helper to log actions (exported for use in other routes)
async function logAction(userId, username, action, entityType, entityId, details, ipAddress) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, username || null, action, entityType || null, entityId || null, details || null, ipAddress || null]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

router.logAction = logAction;

module.exports = router;
