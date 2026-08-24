const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { validatePassword } = require('../utils/validate');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, username, password, phone, university, department, field_of_study, cover_letter, role } = req.body;

    if (!full_name || !email || !username || !password) {
      return res.status(400).json({ error: 'Full name, email, username, and password are required' });
    }

    const allowedRoles = ['intern'];
    const userRole = 'intern';

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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create a pending user account
    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await pool.query(
      'INSERT INTO users (username, password, role, verified, verification_token) VALUES (?, ?, ?, 0, ?) RETURNING id',
      [username, hashedPassword, userRole, verificationToken]
    );

    // Create intern profile with pending status
    await pool.query(
      'INSERT INTO interns (user_id, full_name, email, phone, university, department, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [newUser.insertId, full_name, email, phone || null, university || null, department || null, today, 'pending']
    );

    // Send verification email
    const baseUrl = process.env.BASE_URL || req.protocol + '://' + req.get('host');
    try {
      const emailResult = await sendVerificationEmail(email, verificationToken, baseUrl);
      console.log('Verification email sent to', email, emailResult.previewUrl ? `(preview: ${emailResult.previewUrl})` : '');
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      message: 'Application submitted! Please check your email to verify your account. An administrator will also review your application.',
      email,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const [users] = await pool.query('SELECT id, verified FROM users WHERE verification_token = ?', [token]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = users[0];
    if (user.verified === 1) {
      return res.json({ message: 'Email already verified' });
    }

    await pool.query('UPDATE users SET verified = 1, verification_token = NULL WHERE id = ?', [user.id]);
    res.json({ message: 'Email verified successfully! You can now sign in.' });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email, username } = req.body;
    const identifier = (email || username || '').trim();
    if (!identifier) return res.status(400).json({ error: 'Email or username is required' });

    let userRow = null;
    let userEmail = null;

    // Try username first
    let [byUsername] = await pool.query('SELECT id, verified, verification_token FROM users WHERE username = ?', [identifier]);
    if (byUsername.length > 0) {
      userRow = byUsername[0];
      // find email from intern/supervisor
      let [ie] = await pool.query('SELECT email FROM interns WHERE user_id = ?', [userRow.id]);
      if (ie.length > 0) userEmail = ie[0].email;
      else {
        let [se] = await pool.query('SELECT email FROM supervisors WHERE user_id = ?', [userRow.id]);
        if (se.length > 0) userEmail = se[0].email;
      }
    }
    // Try email in interns/supervisors
    if (!userRow) {
      let [ie] = await pool.query('SELECT user_id, email FROM interns WHERE email = ?', [identifier]);
      if (ie.length > 0 && ie[0].user_id) {
        let [ur] = await pool.query('SELECT id, verified, verification_token FROM users WHERE id = ?', [ie[0].user_id]);
        if (ur.length > 0) { userRow = ur[0]; userEmail = ie[0].email; }
      }
    }
    if (!userRow) {
      let [se] = await pool.query('SELECT user_id, email FROM supervisors WHERE email = ?', [identifier]);
      if (se.length > 0 && se[0].user_id) {
        let [ur] = await pool.query('SELECT id, verified, verification_token FROM users WHERE id = ?', [se[0].user_id]);
        if (ur.length > 0) { userRow = ur[0]; userEmail = se[0].email; }
      }
    }

    if (!userRow) return res.status(404).json({ error: 'No account found with that email or username' });
    if (userRow.verified === 1) return res.json({ message: 'Email already verified. You can sign in.' });
    if (!userEmail) return res.status(400).json({ error: 'No email associated with this account' });

    const newToken = crypto.randomBytes(32).toString('hex');
    await pool.query('UPDATE users SET verification_token = ? WHERE id = ?', [newToken, userRow.id]);

    const baseUrl = process.env.BASE_URL || req.protocol + '://' + req.get('host');
    try {
      await sendVerificationEmail(userEmail, newToken, baseUrl);
    } catch (e) {
      console.error('Resend verification email failed:', e.message);
    }
    res.json({ message: 'Verification email resent. Please check your inbox.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email, username } = req.body;
    const identifier = (email || username || '').trim();
    if (!identifier) return res.status(400).json({ error: 'Email or username is required' });

    let userRow = null;
    let userEmail = null;

    let [byUsername] = await pool.query('SELECT id FROM users WHERE username = ?', [identifier]);
    if (byUsername.length > 0) {
      userRow = byUsername[0];
      let [ie] = await pool.query('SELECT email FROM interns WHERE user_id = ?', [userRow.id]);
      if (ie.length > 0) userEmail = ie[0].email;
      else {
        let [se] = await pool.query('SELECT email FROM supervisors WHERE user_id = ?', [userRow.id]);
        if (se.length > 0) userEmail = se[0].email;
        else {
          // admin has no email; use identifier if it looks like email
          if (identifier.includes('@')) userEmail = identifier;
        }
      }
    }
    if (!userRow) {
      let [ie] = await pool.query('SELECT user_id, email FROM interns WHERE email = ?', [identifier]);
      if (ie.length > 0 && ie[0].user_id) {
        let [ur] = await pool.query('SELECT id FROM users WHERE id = ?', [ie[0].user_id]);
        if (ur.length > 0) { userRow = ur[0]; userEmail = ie[0].email; }
      }
    }
    if (!userRow) {
      let [se] = await pool.query('SELECT user_id, email FROM supervisors WHERE email = ?', [identifier]);
      if (se.length > 0 && se[0].user_id) {
        let [ur] = await pool.query('SELECT id FROM users WHERE id = ?', [se[0].user_id]);
        if (ur.length > 0) { userRow = ur[0]; userEmail = se[0].email; }
      }
    }

    // Always return success to avoid enumeration
    if (!userRow || !userEmail) {
      return res.json({ message: 'If an account exists, a password reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await pool.query('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?', [token, expires, userRow.id]);

    const baseUrl = process.env.BASE_URL || req.protocol + '://' + req.get('host');
    try {
      await sendPasswordResetEmail(userEmail, token, baseUrl);
    } catch (e) {
      console.error('Forgot password email failed:', e.message);
    }
    res.json({ message: 'If an account exists, a password reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
    if (!validatePassword(newPassword)) return res.status(400).json({ error: 'Password must be 6-255 characters' });

    const [users] = await pool.query('SELECT id, password_reset_expires FROM users WHERE password_reset_token = ?', [token]);
    if (users.length === 0) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const user = users[0];
    if (user.password_reset_expires && new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?', [hashed, user.id]);
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
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

    // Check email verification
    if (user.verified === 0 && user.verification_token) {
      return res.status(403).json({ error: 'Please verify your email before signing in. Check your inbox for the verification link.' });
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
