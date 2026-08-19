/* ============================================================
   MESOB COMPONENT LIBRARY
   Reusable UI components for BG Mesob Attendance Platform
   ============================================================ */

// --- SVG ICONS ---
const Icons = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  alertTriangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  mesob: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
};

// --- SVG SIDEBAR ---
function renderSidebar(role, activePage) {
  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor';
  const navLinks = isAdmin
    ? {
        'main': [
          { href: '/admin/dashboard.html', page: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
        ],
        'operations': [
          { href: '/admin/applications.html', page: 'applications', label: 'Applications', icon: Icons.fileText },
          { href: '/admin/interns.html', page: 'interns', label: 'Interns', icon: Icons.users },
          { href: '/admin/supervisors.html', page: 'supervisors', label: 'Supervisors', icon: Icons.shield },
          { href: '/admin/placements.html', page: 'placements', label: 'Placements', icon: Icons.briefcase },
        ],
        'management': [
          { href: '/admin/attendance.html', page: 'attendance', label: 'Attendance', icon: Icons.clock },
          { href: '/admin/departments.html', page: 'departments', label: 'Departments', icon: Icons.building },
          { href: '/admin/announcements.html', page: 'announcements', label: 'Announcements', icon: Icons.megaphone },
        ],
        'system': [
          { href: '/admin/reports.html', page: 'reports', label: 'Reports', icon: Icons.chart },
          { href: '/admin/audit-logs.html', page: 'audit-logs', label: 'Audit Logs', icon: Icons.clipboard },
          { href: '/admin/settings.html', page: 'settings', label: 'Settings', icon: Icons.settings },
        ],
      }
    : isSupervisor
    ? [
        { href: '/supervisor/dashboard.html', page: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
        { href: '/supervisor/interns.html', page: 'interns', label: 'My Interns', icon: Icons.users },
        { href: '/supervisor/attendance.html', page: 'attendance', label: 'Attendance', icon: Icons.clock },
      ]
    : [
        { href: '/intern/dashboard.html', page: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
        { href: '/intern/history.html', page: 'history', label: 'History', icon: Icons.history },
        { href: '/intern/profile.html', page: 'profile', label: 'Profile', icon: Icons.user },
      ];

  const brand = isAdmin ? 'Admin Portal' : isSupervisor ? 'Supervisor Portal' : 'Intern Portal';

  let navHtml = '';
  if (isAdmin) {
    for (const [section, links] of Object.entries(navLinks)) {
      const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1);
      navHtml += `<div class="sidebar-section"><div class="sidebar-section-label">${sectionLabel}</div>`;
      navHtml += links.map(
        (l) => `<a href="${l.href}" class="${l.page === activePage ? 'active' : ''}">${l.icon}<span>${escapeHtml(l.label)}</span></a>`
      ).join('');
      navHtml += '</div>';
    }
  } else {
    navHtml = '<div class="sidebar-section">' + navLinks.map(
      (l) => `<a href="${l.href}" class="${l.page === activePage ? 'active' : ''}">${l.icon}<span>${escapeHtml(l.label)}</span></a>`
    ).join('') + '</div>';
  }

  return `
    <div class="sidebar-brand">
      <div class="sidebar-brand-icon">${Icons.mesob}</div>
      <div>
        <div class="sidebar-brand-text">BG Mesob</div>
        <div class="sidebar-brand-sub">${escapeHtml(brand)}</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section">
        <div class="sidebar-section-label">Navigation</div>
        ${navHtml}
      </div>
    </nav>
    <div class="sidebar-footer">
      <a href="#" onclick="confirmLogout(); return false;">${Icons.logout}<span>Sign Out</span></a>
    </div>`;
}

// --- TOGGLE SIDEBAR (Mobile) ---
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active');
}

// --- ALERT COMPONENT (with SVG icons) ---
function showAlert(container, message, type = 'error') {
  if (!container) return;
  const iconMap = {
    error: Icons.alertTriangle,
    success: Icons.check,
    warning: Icons.alertTriangle,
    info: Icons.info,
  };
  const icon = iconMap[type] || iconMap.error;
  container.innerHTML = `<div class="alert alert-${escapeHtml(type)}" role="alert">${icon}<span>${escapeHtml(message)}</span></div>`;
  setTimeout(() => { container.innerHTML = ''; }, 5000);
}

// --- TOAST NOTIFICATION ---
function showToast(message, type = 'info', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `${iconMap[type] || Icons.info}<span>${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('active'));
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

const iconMap = {
  error: Icons.alertTriangle,
  success: Icons.check,
  warning: Icons.alertTriangle,
  info: Icons.info,
};

// --- MODAL ---
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    const firstInput = overlay.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) {
      activeModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// --- TABLE SORTING ---
function initTableSort(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const headers = table.querySelectorAll('th[data-sort]');
  headers.forEach((th) => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const idx = Array.from(th.parentNode.children).indexOf(th);
      const dir = th.dataset.dir === 'asc' ? 'desc' : 'asc';
      th.dataset.dir = dir;

      headers.forEach((h) => { if (h !== th) delete h.dataset.dir; });

      rows.sort((a, b) => {
        const aVal = (a.children[idx]?.textContent || '').trim().toLowerCase();
        const bVal = (b.children[idx]?.textContent || '').trim().toLowerCase();
        const numA = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
        const numB = parseFloat(bVal.replace(/[^0-9.-]/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) return dir === 'asc' ? numA - numB : numB - numA;
        return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });

      rows.forEach((r) => tbody.appendChild(r));
    });
  });
}

// --- TABLE FILTER (live search) ---
function filterTable(tableId, searchTerm, columns) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const tbody = table.querySelector('tbody');
  const rows = tbody.querySelectorAll('tr');
  const term = searchTerm.toLowerCase();

  rows.forEach((row) => {
    if (row.querySelector('.empty-state')) return;
    const text = Array.from(row.children)
      .map((td, i) => (columns && columns.includes(i) ? td.textContent : ''))
      .join(' ')
      .toLowerCase();
    const matchAll = !term || Array.from(row.children).some((td) => td.textContent.toLowerCase().includes(term));
    row.style.display = matchAll ? '' : 'none';
  });
}

// --- LOADING SKELETON ---
function renderSkeleton(rows, cols) {
  let html = '';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      html += `<td><div class="skeleton" style="height:16px;width:${60 + Math.random() * 40}%"></div></td>`;
    }
    html += '</tr>';
  }
  return html;
}

// --- EMPTY STATE ---
function renderEmptyState(message, icon) {
  const svg = icon || Icons.info;
  return `
    <tr><td colspan="100">
      <div class="empty-state">
        <div class="empty-state-icon">${svg}</div>
        <h3>${escapeHtml(message)}</h3>
      </div>
    </td></tr>`;
}

// --- STAT CARD ---
function renderStatCard(label, value, accent, meta) {
  return `
    <div class="stat-card">
      <div class="stat-card-accent ${escapeHtml(accent)}"></div>
      <div class="stat-card-label">${escapeHtml(label)}</div>
      <div class="stat-card-value">${value}</div>
      ${meta ? `<div class="stat-card-meta">${escapeHtml(meta)}</div>` : ''}
    </div>`;
}

// --- CONFIRM DIALOG ---
function confirmDialog(title, message, onConfirm, confirmLabel = 'Confirm', danger = false) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="modal-close" data-close>&times;</button>
      </div>
      <div class="modal-body">
        <p class="text-sm text-muted">${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" data-close>Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-confirm]').addEventListener('click', () => { close(); onConfirm(); });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
  });
}

// --- LOGOUT CONFIRM ---
function confirmLogout() {
  confirmDialog(
    'Sign Out',
    'Are you sure you want to sign out of your account?',
    () => { clearAuth(); window.location.href = '/login.html'; },
    'Sign Out',
    true
  );
}

// --- DATE/TIME UTILITIES ---
function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '\u2014';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

// --- BADGE ---
function statusBadge(status) {
  const safe = escapeHtml(status);
  return `<span class="badge badge-${safe}">${safe}</span>`;
}

// --- CLOCK ---
function updateClock(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  function tick() {
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: true });
  }
  tick();
  setInterval(tick, 1000);
}
