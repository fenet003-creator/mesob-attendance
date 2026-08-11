const API_BASE = window.location.hostname === 'localhost'
  ? '/api'
  : 'https://bg-mesob-attendance-api.onrender.com/api';

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
    window.location.href = user.role === 'admin' ? '/admin/dashboard.html' : '/intern/dashboard.html';
    return null;
  }
  return user;
}

function logout() {
  if (!confirm('Are you sure you want to logout?')) return;
  clearAuth();
  window.location.href = '/login.html';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function statusBadge(status) {
  const safe = escapeHtml(status);
  return `<span class="badge badge-${safe}">${safe}</span>`;
}

function showAlert(container, message, type = 'error') {
  container.innerHTML = `<div class="alert alert-${escapeHtml(type)}">${escapeHtml(message)}</div>`;
  setTimeout(() => { container.innerHTML = ''; }, 5000);
}

function renderSidebar(role, activePage) {
  const isAdmin = role === 'admin';
  const brand = isAdmin ? 'Admin Portal' : 'Intern Portal';
  const links = isAdmin
    ? [
        { href: '/admin/dashboard.html', page: 'dashboard', label: 'Dashboard' },
        { href: '/admin/interns.html', page: 'interns', label: 'Interns' },
        { href: '/admin/reports.html', page: 'reports', label: 'Reports' },
        { href: '/admin/settings.html', page: 'settings', label: 'Settings' },
      ]
    : [
        { href: '/intern/dashboard.html', page: 'dashboard', label: 'Dashboard' },
        { href: '/intern/history.html', page: 'history', label: 'History' },
        { href: '/intern/profile.html', page: 'profile', label: 'Profile' },
      ];

  const navHtml = links
    .map(
      (l) =>
        `<a href="${l.href}" class="${l.page === activePage ? 'active' : ''}">${escapeHtml(l.label)}</a>`
    )
    .join('');

  return `
    <div class="sidebar-brand">
      <h2>BG Mesob</h2>
      <span>${escapeHtml(brand)}</span>
    </div>
    <button class="sidebar-close" onclick="toggleSidebar()">&times;</button>
    <nav>
      ${navHtml}
      <a href="#" onclick="logout(); return false;">Logout</a>
    </nav>`;
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

function updateClock(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  function tick() {
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: true });
  }
  tick();
  setInterval(tick, 1000);
}
