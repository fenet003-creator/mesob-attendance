const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { validatePassword } = require('../utils/validate');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, username, password, phone, university, department, field_of_study, cover_letter, role } = req.body;

    if (!full_name || !email || !username || !password) {
      return res.status(400).json({ error: 'Full name, email, username, and password are required' });
    }

    const allowedRoles = ['intern', 'supervisor'];
    const userRole = allowedRoles.includes(role) ? role : 'intern';

    // Check if email already used
    const [existingEmail] = await pool.query('SELECT id FROM applications WHERE email = ? LIMIT 1', [email]);
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'An application with this email already exists' });
    }

    // Check if username already taken
    const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // Create application record
    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      'INSERT INTO applications (applicant_name, email, phone, university, department, field_of_study, start_date, cover_letter, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [full_name, email, phone || null, university || null, department || null, field_of_study || null, today, cover_letter || null, 'pending']
    );

    // Also create a pending user account so they can log in once approved
    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?) RETURNING id',
      [username, hashedPassword, userRole]
    );

    // Create intern profile with pending status
    if (userRole === 'intern') {
      await pool.query(
        'INSERT INTO interns (user_id, full_name, email, phone, university, department, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [newUser.insertId, full_name, email, phone || null, university || null, department || null, today, 'pending']
      );
    } else if (userRole === 'supervisor') {
      await pool.query(
        'INSERT INTO supervisors (user_id, full_name, email, phone, department, status) VALUES (?, ?, ?, ?, ?, ?)',
        [newUser.insertId, full_name, email, phone || null, department || null, 'pending']
      );
    }

    res.status(201).json({
      message: 'Application submitted successfully! Your account is pending approval. You will be able to sign in once an administrator approves your application.',
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }
    if (username.length > 100 || password.length > 255) {
      return res.status(400).json({ error: 'Input too long' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let internId = null;
    let fullName = user.username;

    if (user.role === 'intern') {
      const [interns] = await pool.query(
        'SELECT id, full_name, status FROM interns WHERE user_id = ?',
        [user.id]
      );
      if (interns.length === 0) {
        return res.status(403).json({ error: 'Intern profile not found' });
      }
      if (interns[0].status === 'inactive' || interns[0].status === 'rejected') {
        return res.status(403).json({ error: 'Your account has been deactivated or rejected' });
      }
      if (interns[0].status === 'pending') {
        return res.status(403).json({ error: 'Your account is pending approval. Please wait for an administrator to approve your application.' });
      }
      internId = interns[0].id;
      fullName = interns[0].full_name;
    }

    if (user.role === 'supervisor') {
      const [sups] = await pool.query(
        'SELECT id, full_name, status FROM supervisors WHERE user_id = ?',
        [user.id]
      );
      if (sups.length > 0) {
        if (sups[0].status === 'pending') {
          return res.status(403).json({ error: 'Your supervisor account is pending approval.' });
        }
        fullName = sups[0].full_name;
      }
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, internId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, internId, fullName },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, role FROM users WHERE id = ?', [
      req.user.id,
    ]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    let profile = { ...user, fullName: user.username };

    if (user.role === 'intern') {
      const [interns] = await pool.query('SELECT * FROM interns WHERE user_id = ?', [user.id]);
      if (interns.length > 0) {
        profile = { ...profile, intern: interns[0], fullName: interns[0].full_name };
      }
    }

    res.json(profile);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ error: 'New password must be 6-255 characters' });
    }

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, users[0].password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
