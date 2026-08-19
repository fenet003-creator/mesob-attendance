const API_BASE = '/api';

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth();
    window.location.href = '/login.html';
    throw new Error('Session expired');
  }

  if (options.raw) {
    return response;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function requireAuth(requiredRole) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = '/login.html';
    return null;
  }
  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'admin') window.location.href = '/admin/dashboard.html';
    else if (user.role === 'supervisor') window.location.href = '/supervisor/dashboard.html';
    else window.location.href = '/intern/dashboard.html';
    return null;
  }
  return user;
}
