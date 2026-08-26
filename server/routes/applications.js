const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateRequired, validateIntId } = require('../utils/validate');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { search, status, university, department } = req.query;
    let query = 'SELECT * FROM applications WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (applicant_name LIKE ? OR email LIKE ? OR university LIKE ? OR department LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (university) {
      query += ' AND university LIKE ?';
      params.push(`%${university}%`);
    }
    if (department) {
      query += ' AND department LIKE ?';
      params.push(`%${department}%`);
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('List applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

router.get('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }
    const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get application error:', err);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { applicant_name, email, phone, university, department, field_of_study, start_date, end_date, cover_letter } = req.body;
    const requiredErr = validateRequired(['applicant_name', 'email'], req.body);
    if (requiredErr) {
      return res.status(400).json({ error: requiredErr });
    }

    const [result] = await pool.query(
      `INSERT INTO applications (applicant_name, email, phone, university, department, field_of_study, start_date, end_date, cover_letter)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [applicant_name, email, phone || null, university || null, department || null, field_of_study || null, start_date || null, end_date || null, cover_letter || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Application created successfully' });
  } catch (err) {
    console.error('Create application error:', err);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }
    const { applicant_name, email, phone, university, department, field_of_study, start_date, end_date, cover_letter } = req.body;

    const [existing] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    await pool.query(
      `UPDATE applications SET applicant_name=?, email=?, phone=?, university=?, department=?, field_of_study=?, start_date=?, end_date=?, cover_letter=?, updated_at=datetime('now') WHERE id=?`,
      [
        applicant_name || existing[0].applicant_name,
        email || existing[0].email,
        phone ?? existing[0].phone,
        university ?? existing[0].university,
        department ?? existing[0].department,
        field_of_study ?? existing[0].field_of_study,
        start_date ?? existing[0].start_date,
        end_date ?? existing[0].end_date,
        cover_letter ?? existing[0].cover_letter,
        req.params.id,
      ]
    );
    res.json({ message: 'Application updated successfully' });
  } catch (err) {
    console.error('Update application error:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

router.post('/:id/approve', authenticate, requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }
    const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Only pending applications can be approved' });
    }

    await pool.query(
      `UPDATE applications SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [req.user.id, req.params.id]
    );

    // Auto-create intern account from application
    const app = rows[0];
    const bcrypt = require('bcryptjs');
    const defaultPassword = await bcrypt.hash('intern123', 10);
    const baseUsername = app.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    let username = baseUsername;
    let userId = null;

    try {
      // Ensure unique username
      let suffix = 0;
      while (true) {
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length === 0) break;
        suffix++;
        username = `${baseUsername}${suffix}`;
        if (suffix > 10) throw new Error('Username generation failed');
      }

      const [userResult] = await pool.query(
        'INSERT INTO users (username, password, role, verified) VALUES (?, ?, ?, 1)',
        [username, defaultPassword, 'intern']
      );
      userId = userResult.insertId;
      await pool.query(
        `INSERT INTO interns (user_id, full_name, email, phone, university, department, start_date, end_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [userId, app.applicant_name, app.email, app.phone, app.university, app.department, app.start_date, app.end_date]
      );

      // Also mark the self-registered pending intern (from /auth/register) as active if exists
      try {
        await pool.query("UPDATE interns SET status='active', updated_at=datetime('now') WHERE email=? AND status='pending'", [app.email]);
        await pool.query("UPDATE users SET verified=1 WHERE id IN (SELECT user_id FROM interns WHERE email=?)", [app.email]);
      } catch (_) {}

      // Send approval email
      try {
        const { sendApprovalEmail } = require('../utils/email');
        const baseUrl = process.env.BASE_URL || 'https://bg-mesob-attendance.vercel.app';
        await sendApprovalEmail(app.email, app.applicant_name, username, baseUrl);
        console.log(`📧 Approval email sent to ${app.email} via ${req.user.role} ${req.user.username}`);
      } catch (emailErr) {
        console.error('Approval email failed:', emailErr.message);
      }
    } catch (e) {
      console.warn('Auto-create intern from application failed:', e.message);
    }

    res.json({ message: 'Application approved' + (userId ? ` — account ${username} created` : '') });
  } catch (err) {
    console.error('Approve application error:', err);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

router.post('/:id/reject', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }
    const { rejection_reason } = req.body;

    const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    await pool.query(
      `UPDATE applications SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [rejection_reason || null, req.user.id, req.params.id]
    );
    res.json({ message: 'Application rejected' });
  } catch (err) {
    console.error('Reject application error:', err);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

router.post('/:id/request-correction', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }
    const { notes } = req.body;

    const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    await pool.query(
      `UPDATE applications SET status = 'correction_requested', rejection_reason = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [notes || null, req.user.id, req.params.id]
    );
    res.json({ message: 'Correction requested' });
  } catch (err) {
    console.error('Request correction error:', err);
    res.status(500).json({ error: 'Failed to request correction' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!validateIntId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }
    const [result] = await pool.query('DELETE FROM applications WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json({ message: 'Application deleted' });
  } catch (err) {
    console.error('Delete application error:', err);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

module.exports = router;
