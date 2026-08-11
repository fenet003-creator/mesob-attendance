const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Valid setting keys to prevent arbitrary DB writes
const ALLOWED_KEYS = ['work_start_time', 'late_threshold', 'absent_threshold'];

// GET /api/settings — admin only
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?)',
      [ALLOWED_KEYS]
    );
    const result = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
    res.json(result);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings — admin only
router.put('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body; // { work_start_time: '08:00', late_threshold: '08:15', ... }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const timeRegex = /^\d{2}:\d{2}$/;
    const entries = Object.entries(updates);

    for (const [key, value] of entries) {
      if (!ALLOWED_KEYS.includes(key)) {
        return res.status(400).json({ error: `Unknown setting key: ${key}` });
      }
      if (!timeRegex.test(value)) {
        return res.status(400).json({ error: `Invalid time format for ${key}. Use HH:MM.` });
      }
    }

    // Upsert each setting
    for (const [key, value] of entries) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
