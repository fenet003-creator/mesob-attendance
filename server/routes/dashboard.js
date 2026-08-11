const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { getTodayDateString } = require('../utils/attendance');

const router = express.Router();

router.get('/summary', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const today = getTodayDateString();

    const [internCount] = await pool.query(
      "SELECT COUNT(*) as total FROM interns WHERE status = 'active'"
    );

    const [todayStats] = await pool.query(
      `SELECT
        SUM(attendance_status = 'present') as present,
        SUM(attendance_status = 'late') as late,
        SUM(attendance_status = 'absent') as absent,
        COUNT(*) as checked_in
       FROM attendance WHERE attendance_date = ?`,
      [today]
    );

    const totalActive = internCount[0].total;
    const checkedIn = Number(todayStats[0].checked_in) || 0;
    const present = Number(todayStats[0].present) || 0;
    const late = Number(todayStats[0].late) || 0;
    // absent = interns who never checked in today (no row at all)
    const absent = Math.max(totalActive - checkedIn, 0);

    const [recent] = await pool.query(
      `SELECT a.*, i.full_name, i.department
       FROM attendance a
       JOIN interns i ON a.intern_id = i.id
       WHERE a.attendance_date = ?
       ORDER BY a.updated_at DESC
       LIMIT 10`,
      [today]
    );

    res.json({
      total_interns: totalActive,
      present_today: present,
      late_today: late,
      absent_today: Math.max(absent, 0),
      recent_activities: recent,
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;
