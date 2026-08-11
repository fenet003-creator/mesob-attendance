const express = require('express');
const XLSX = require('xlsx');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { getTodayDateString } = require('../utils/attendance');
const { validateIntId, validateDate } = require('../utils/validate');

const router = express.Router();

async function fetchReportData({ type, intern_id, start_date, end_date }) {
  if (intern_id && !validateIntId(intern_id)) {
    throw new Error('Invalid intern ID');
  }
  if (start_date && !validateDate(start_date)) {
    throw new Error('Invalid start date format');
  }
  if (end_date && !validateDate(end_date)) {
    throw new Error('Invalid end date format');
  }

  let query = `
    SELECT a.attendance_date, a.check_in, a.check_out, a.attendance_status,
           i.full_name, i.email, i.university, i.department
    FROM attendance a
    JOIN interns i ON a.intern_id = i.id
    WHERE 1=1
  `;
  const params = [];
  const today = new Date();

  if (type === 'daily') {
    query += ' AND a.attendance_date = ?';
    params.push(getTodayDateString());
  } else if (type === 'weekly') {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    query += ' AND a.attendance_date >= ?';
    params.push(weekAgo.toISOString().slice(0, 10));
  } else if (type === 'monthly') {
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    query += ' AND a.attendance_date >= ?';
    params.push(monthAgo.toISOString().slice(0, 10));
  }

  if (intern_id) {
    query += ' AND a.intern_id = ?';
    params.push(intern_id);
  }
  if (start_date) {
    query += ' AND a.attendance_date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND a.attendance_date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY a.attendance_date DESC, i.full_name ASC';
  const [rows] = await pool.query(query, params);
  return rows;
}

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const data = await fetchReportData(req.query);
    res.json(data);
  } catch (err) {
    if (err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/summary', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (start_date && !validateDate(start_date)) {
      return res.status(400).json({ error: 'Invalid start date format' });
    }
    if (end_date && !validateDate(end_date)) {
      return res.status(400).json({ error: 'Invalid end date format' });
    }

    let query = `
      SELECT i.full_name, i.department, i.university,
        COUNT(a.id) as total_days,
        SUM(a.attendance_status = 'present') as present,
        SUM(a.attendance_status = 'late') as late,
        SUM(a.attendance_status = 'absent') as absent
      FROM interns i
      LEFT JOIN attendance a ON i.id = a.intern_id
    `;
    const params = [];
    const conditions = ["i.status = 'active'"];

    if (start_date) {
      conditions.push('(a.attendance_date >= ? OR a.attendance_date IS NULL)');
      params.push(start_date);
    }
    if (end_date) {
      conditions.push('(a.attendance_date <= ? OR a.attendance_date IS NULL)');
      params.push(end_date);
    }

    query += ` WHERE ${conditions.join(' AND ')} GROUP BY i.id ORDER BY i.full_name`;
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Summary report error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

router.get('/export/excel', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const data = await fetchReportData(req.query);
    const sheetData = data.map((row) => ({
      Date: row.attendance_date,
      Name: row.full_name,
      Email: row.email,
      University: row.university,
      Department: row.department,
      'Check In': row.check_in || '-',
      'Check Out': row.check_out || '-',
      Status: row.attendance_status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    if (err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

module.exports = router;
