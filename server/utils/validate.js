const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function validateEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email) && email.length <= 150;
}

function validateUsername(username) {
  return typeof username === 'string' && USERNAME_RE.test(username) && username.length >= 3 && username.length <= 100;
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}

function validateString(value, maxLen = 255) {
  if (value === undefined || value === null || value === '') return true;
  return typeof value === 'string' && value.length <= maxLen;
}

function validateDate(value) {
  if (value === undefined || value === null || value === '') return true;
  return typeof value === 'string' && DATE_RE.test(value);
}

function validateTime(value) {
  if (value === undefined || value === null || value === '') return true;
  return typeof value === 'string' && TIME_RE.test(value);
}

function validateStatus(value) {
  const allowed = ['active', 'inactive', 'completed'];
  return allowed.includes(value);
}

function validateRole(value) {
  const allowed = ['admin', 'intern'];
  return allowed.includes(value);
}

function validateRequired(fields, body) {
  const missing = fields.filter(f => !body[f]);
  if (missing.length > 0) {
    return `Required fields: ${missing.join(', ')}`;
  }
  return null;
}

function validateInternInput(body, isUpdate = false) {
  const errors = [];

  if (!isUpdate) {
    if (!validateUsername(body.username)) {
      errors.push('Username must be 3-100 alphanumeric characters or underscores');
    }
    if (!validatePassword(body.password)) {
      errors.push('Password must be 6-255 characters');
    }
  }

  if (body.full_name !== undefined && !validateString(body.full_name, 150)) {
    errors.push('Full name must be under 150 characters');
  }
  if (body.email !== undefined && !validateEmail(body.email)) {
    errors.push('Invalid email format');
  }
  if (body.phone !== undefined && !validateString(body.phone, 20)) {
    errors.push('Phone must be under 20 characters');
  }
  if (body.university !== undefined && !validateString(body.university, 150)) {
    errors.push('University must be under 150 characters');
  }
  if (body.department !== undefined && !validateString(body.department, 150)) {
    errors.push('Department must be under 150 characters');
  }
  if (body.start_date !== undefined && !validateDate(body.start_date)) {
    errors.push('Invalid start date format (YYYY-MM-DD)');
  }
  if (body.end_date !== undefined && !validateDate(body.end_date)) {
    errors.push('Invalid end date format (YYYY-MM-DD)');
  }
  if (body.status !== undefined && !validateStatus(body.status)) {
    errors.push('Status must be active, inactive, or completed');
  }

  return errors.length > 0 ? errors : null;
}

function validateIntId(value) {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0;
}

module.exports = {
  EMAIL_RE,
  TIME_RE,
  DATE_RE,
  USERNAME_RE,
  validateEmail,
  validateUsername,
  validatePassword,
  validateString,
  validateDate,
  validateTime,
  validateStatus,
  validateRole,
  validateRequired,
  validateInternInput,
  validateIntId,
};
