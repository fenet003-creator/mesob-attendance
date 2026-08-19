const { chromium } = require('playwright');

const BASE = 'https://bg-mesob-attendance.vercel.app';
let passed = 0;
let failed = 0;
const results = [];

function log(status, msg) {
  const line = `${status}: ${msg}`;
  results.push(line);
  console.log(line);
  if (status === 'PASS') passed++;
  else failed++;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // Test 1: Landing page loads
    const resp = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    if (resp.status() === 200) {
      log('PASS', `Landing page loaded (HTTP ${resp.status()})`);
    } else {
      log('FAIL', `Landing page returned HTTP ${resp.status()}`);
    }

    // Test 2: Landing page title
    const title = await page.title();
    if (title.includes('BG Mesob')) {
      log('PASS', `Landing page title: "${title}"`);
    } else {
      log('FAIL', `Wrong title: "${title}"`);
    }

    // Test 3: Hero section visible
    const heroText = await page.textContent('.hero-text h2');
    if (heroText && heroText.includes('Ethiopia')) {
      log('PASS', 'Hero section has Ethiopia text');
    } else {
      log('FAIL', 'Hero section missing');
    }

    // Test 4: Nav sign-in link works
    const signInLink = await page.locator('.nav-cta').first();
    await signInLink.click();
    await page.waitForURL('**/login.html', { timeout: 10000 });
    if (page.url().includes('login.html')) {
      log('PASS', 'Sign In button navigates to login page');
    } else {
      log('FAIL', 'Sign In navigation failed');
    }

    // Test 5: Login page loads
    const loginTitle = await page.title();
    if (loginTitle.includes('Sign In') || loginTitle.includes('Login')) {
      log('PASS', `Login page loaded: "${loginTitle}"`);
    } else {
      log('FAIL', `Login page wrong title: "${loginTitle}"`);
    }

    // Test 6: Login form exists
    const usernameInput = await page.locator('#username').count();
    const passwordInput = await page.locator('#password').count();
    if (usernameInput > 0 && passwordInput > 0) {
      log('PASS', 'Login form has username and password fields');
    } else {
      log('FAIL', 'Login form missing fields');
    }

    // Test 7: Login with admin credentials
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('#loginBtn');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 15000 });
    if (page.url().includes('admin/dashboard.html')) {
      log('PASS', 'Admin login successful → dashboard');
    } else {
      log('FAIL', `Admin login redirect failed, URL: ${page.url()}`);
    }

    // Test 8: Dashboard has sidebar
    const sidebar = await page.locator('.sidebar').count();
    if (sidebar > 0) {
      log('PASS', 'Dashboard has sidebar navigation');
    } else {
      log('FAIL', 'Dashboard missing sidebar');
    }

    // Test 9: Dashboard has stat cards
    const statCards = await page.locator('.stat-card').count();
    if (statCards >= 4) {
      log('PASS', `Dashboard has ${statCards} stat cards`);
    } else {
      log('FAIL', `Dashboard only has ${statCards} stat cards`);
    }

    // Test 10: Navigate to Applications page
    await page.goto(`${BASE}/admin/applications.html`, { waitUntil: 'networkidle', timeout: 15000 });
    const appTitle = await page.title();
    if (appTitle.includes('Application')) {
      log('PASS', `Applications page loaded: "${appTitle}"`);
    } else {
      log('FAIL', `Applications page failed: "${appTitle}"`);
    }

    // Test 11: Navigate to Supervisors page
    await page.goto(`${BASE}/admin/supervisors.html`, { waitUntil: 'networkidle', timeout: 15000 });
    const supTitle = await page.title();
    if (supTitle.includes('Supervisor')) {
      log('PASS', `Supervisors page loaded: "${supTitle}"`);
    } else {
      log('FAIL', `Supervisors page failed: "${supTitle}"`);
    }

    // Test 12: Navigate to Placements page
    await page.goto(`${BASE}/admin/placements.html`, { waitUntil: 'networkidle', timeout: 15000 });
    const plTitle = await page.title();
    if (plTitle.includes('Placement')) {
      log('PASS', `Placements page loaded: "${plTitle}"`);
    } else {
      log('FAIL', `Placements page failed: "${plTitle}"`);
    }

    // Test 13: Navigate to Attendance page
    await page.goto(`${BASE}/admin/attendance.html`, { waitUntil: 'networkidle', timeout: 15000 });
    const attTitle = await page.title();
    if (attTitle.includes('Attendance')) {
      log('PASS', `Attendance page loaded: "${attTitle}"`);
    } else {
      log('FAIL', `Attendance page failed: "${attTitle}"`);
    }

    // Test 14: Navigate to Departments page
    await page.goto(`${BASE}/admin/departments.html`, { waitUntil: 'networkidle', timeout: 15000 });
    const depTitle = await page.title();
    if (depTitle.includes('Department')) {
      log('PASS', `Departments page loaded: "${depTitle}"`);
    } else {
      log('FAIL', `Departments page failed: "${depTitle}"`);
    }

    // Test 15: Navigate to Reports page
    await page.goto(`${BASE}/admin/reports.html`, { waitUntil: 'networkidle', timeout: 15000 });
    const repTitle = await page.title();
    if (repTitle.includes('Report')) {
      log('PASS', `Reports page loaded: "${repTitle}"`);
    } else {
      log('FAIL', `Reports page failed: "${repTitle}"`);
    }

    // Test 16: Navigate to Announcements page
    await page.goto(`${BASE}/admin/announcements.html`, { waitUntil: 'networkidle', timeout: 15000 });
    const annTitle = await page.title();
    if (annTitle.includes('Announcement')) {
      log('PASS', `Announcements page loaded: "${annTitle}"`);
    } else {
      log('FAIL', `Announcements page failed: "${annTitle}"`);
    }

    // Test 17: Navigate to Audit Logs page
    await page.goto(`${BASE}/admin/audit-logs.html`, { waitUntil: 'networkidle', timeout: 15000 });
    const audTitle = await page.title();
    if (audTitle.includes('Audit')) {
      log('PASS', `Audit Logs page loaded: "${audTitle}"`);
    } else {
      log('FAIL', `Audit Logs page failed: "${audTitle}"`);
    }

    // Test 18: Navigate to Settings page
    await page.goto(`${BASE}/admin/settings.html`, { waitUntil: 'networkidle', timeout: 15000 });
    const setTitle = await page.title();
    if (setTitle.includes('Settings')) {
      log('PASS', `Settings page loaded: "${setTitle}"`);
    } else {
      log('FAIL', `Settings page failed: "${setTitle}"`);
    }

    // Test 19: Logout works
    await page.goto(`${BASE}/admin/dashboard.html`, { waitUntil: 'networkidle', timeout: 15000 });
    // Click the sign out link in sidebar footer
    const logoutLink = page.locator('.sidebar-footer a');
    if (await logoutLink.count() > 0) {
      await logoutLink.click();
      // Confirm dialog should appear - click confirm
      const confirmBtn = page.locator('[data-confirm]');
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
        await page.waitForURL('**/login.html', { timeout: 10000 });
        log('PASS', 'Logout works → redirected to login');
      } else {
        log('FAIL', 'Logout confirm dialog not found');
      }
    } else {
      log('FAIL', 'Logout link not found');
    }

    // Test 20: Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    const mobileHero = await page.textContent('.hero-text h2');
    if (mobileHero) {
      log('PASS', 'Landing page renders on mobile (375px)');
    } else {
      log('FAIL', 'Landing page broken on mobile');
    }

  } catch (err) {
    log('FAIL', `Unexpected error: ${err.message}`);
  } finally {
    await browser.close();
    console.log(`\n=== BROWSER TESTS: ${passed} passed, ${failed} failed out of ${passed + failed} ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
})();
