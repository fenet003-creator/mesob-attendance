const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getCurrentTimeString,
  getTodayDateString,
  determineStatus,
} = require('../utils/attendance');
const { validateIntId, validateDate, validateStatus } = require('../utils/validate');

const router = express.Router();

router.post('/check-in', authenticate, requireRole('intern'), async (req, res) => {
  try {
    const internId = req.user.internId;
    const today = getTodayDateString();
    const checkInTime = getCurrentTimeString();

    // Load configurable thresholds from settings table
    const [settings] = await pool.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('late_threshold', 'absent_threshold')"
    );
    const settingsMap = Object.fromEntries(settings.map((s) => [s.setting_key, s.setting_value]));
    const status = determineStatus(
      checkInTime,
      settingsMap.late_threshold,
      settingsMap.absent_threshold
    );

    const [existing] = await pool.query(
      'SELECT * FROM attendance WHERE intern_id = ? AND attendance_date = ?',
      [internId, today]
    );

    if (existing.length > 0 && existing[0].check_in) {
      return res.status(400).json({ error: 'Already checked in today', record: existing[0] });
    }

    if (existing.length > 0) {
      await pool.query(
        'UPDATE attendance SET check_in = ?, attendance_status = ? WHERE id = ?',
        [checkInTime, status, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO attendance (intern_id, attendance_date, check_in, attendance_status) VALUES (?, ?, ?, ?)',
        [internId, today, checkInTime, status]
      );
    }

    const [record] = await pool.query(
      'SELECT * FROM attendance WHERE intern_id = ? AND attendance_date = ?',
      [internId, today]
    );

    res.json({ message: 'Checked in successfully', status, record: record[0] });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

router.post('/check-out', authenticate, requireRole('intern'), async (req, res) => {
  try {
    const internId = req.user.internId;
    const today = getTodayDateString();
    const checkOutTime = getCurrentTimeString();

    const [existing] = await pool.query(
      'SELECT * FROM attendance WHERE intern_id = ? AND attendance_date = ?',
      [internId, today]
    );

    if (existing.length === 0 || !existing[0].check_in) {
      return res.status(400).json({ error: 'You must check in before checking out' });
    }

    if (existing[0].check_out) {
      return res.status(400).json({ error: 'Already checked out today', record: existing[0] });
    }

    await pool.query(
      'UPDATE attendance SET check_out = ? WHERE id = ?',
      [checkOutTime, existing[0].id]
    );

    const [record] = await pool.query(
      'SELECT * FROM attendance WHERE intern_id = ? AND attendance_date = ?',
      [internId, today]
    );

    res.json({ message: 'Checked out successfully', record: record[0] });
  } catch (err) {
    console.error('Check-out error:', err);
    res.status(500).json({ error: 'Check-out failed' });
  }
});

router.get('/today', authenticate, async (req, res) => {
  try {
    const today = getTodayDateString();
    let query = `
      SELECT a.*, i.full_name, i.department, i.university
      FROM attendance a
      JOIN interns i ON a.intern_id = i.id
      WHERE a.attendance_date = ?
    `;
    const params = [today];

    if (req.user.role === 'intern') {
      query += ' AND a.intern_id = ?';
      params.push(req.user.internId);
    }

    query += ' ORDER BY a.check_in ASC';
    const [records] = await pool.query(query, params);
    res.json(records);
  } catch (err) {
    console.error('Today attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch today attendance' });
  }
});

router.get('/date/:date', authenticate, async (req, res) => {
  try {
    const { date } = req.params;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
    }
    let query = `
      SELECT a.*, i.full_name, i.department, i.university
      FROM attendance a
      JOIN interns i ON a.intern_id = i.id
      WHERE a.attendance_date = ?
    `;
    const params = [date];

    if (req.user.role === 'intern') {
      query += ' AND a.intern_id = ?';
      params.push(req.user.internId);
    }

    query += ' ORDER BY a.check_in ASC';
    const [records] = await pool.query(query, params);
    res.json(records);
  } catch (err) {
    console.error('Date attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const { period, intern_id, start_date, end_date, status } = req.query;
    let internId = intern_id;

    if (req.user.role === 'intern') {
      internId = req.user.internId;
    }

    if (internId && !validateIntId(internId)) {
      return res.status(400).json({ error: 'Invalid intern ID' });
    }

    if (!internId && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Intern ID required' });
    }

    if (start_date && !validateDate(start_date)) {
      return res.status(400).json({ error: 'Invalid start date format' });
    }
    if (end_date && !validateDate(end_date)) {
      return res.status(400).json({ error: 'Invalid end date format' });
    }
    if (status && !validateStatus(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    let query = `
      SELECT a.*, i.full_name, i.department, i.university
      FROM attendance a
      JOIN interns i ON a.intern_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (internId) {
      query += ' AND a.intern_id = ?';
      params.push(internId);
    }

    const today = new Date();
    if (period === 'daily') {
      query += ' AND a.attendance_date = ?';
      params.push(getTodayDateString());
    } else if (period === 'weekly') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      query += ' AND a.attendance_date >= ?';
      params.push(weekAgo.toISOString().slice(0, 10));
    } else if (period === 'monthly') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query += ' AND a.attendance_date >= ?';
      params.push(monthAgo.toISOString().slice(0, 10));
    }

    if (start_date) {
      query += ' AND a.attendance_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND a.attendance_date <= ?';
      params.push(end_date);
    }
    if (status) {
      query += ' AND a.attendance_status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.attendance_date DESC, a.check_in DESC';
    const [records] = await pool.query(query, params);
    res.json(records);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    let internId = req.query.intern_id;
    if (req.user.role === 'intern') {
      internId = req.user.internId;
    }

    if (internId && !validateIntId(internId)) {
      return res.status(400).json({ error: 'Invalid intern ID' });
    }

    const params = [];
    let whereClause = 'WHERE 1=1';
    if (internId) {
      whereClause += ' AND intern_id = ?';
      params.push(internId);
    }

    const [stats] = await pool.query(
      `SELECT
        COUNT(*) as total_records,
        SUM(attendance_status = 'present') as present,
        SUM(attendance_status = 'late') as late,
        SUM(attendance_status = 'absent') as absent
       FROM attendance ${whereClause}`,
      params
    );

    const total = stats[0].total_records || 0;
    const present = Number(stats[0].present) || 0;
    const late = Number(stats[0].late) || 0;
    const absent = Number(stats[0].absent) || 0;
    // Attendance percentage counts both present and late as attended
    const attended = present + late;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

    res.json({
      total,
      present,
      late,
      absent,
      attendance_percentage: percentage,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid attendance record ID' });
    }

    const { check_in, check_out, attendance_status, attendance_date } = req.body;

    const [existing] = await pool.query('SELECT * FROM attendance WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    if (attendance_status && !validateStatus(attendance_status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    if (attendance_date && !validateDate(attendance_date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    await pool.query(
      `UPDATE attendance SET
        check_in = COALESCE(?, check_in),
        check_out = COALESCE(?, check_out),
        attendance_status = COALESCE(?, attendance_status),
        attendance_date = COALESCE(?, attendance_date),
        updated_at = datetime('now')
       WHERE id = ?`,
      [check_in ?? null, check_out ?? null, attendance_status ?? null, attendance_date ?? null, req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM attendance WHERE id = ?', [req.params.id]);
    res.json({ message: 'Attendance record updated', record: updated[0] });
  } catch (err) {
    console.error('Update attendance error:', err);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
});

module.exports = router;
