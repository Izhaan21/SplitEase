/* ============================================================
   profile.js  —  SplitEase  |  dev-logic
   Handles: profile load/save (localStorage), dynamic stats
            calculation, group badges, activity log,
            sidebar, logout, and preferences application.

   Firebase Note: All localStorage calls are intentionally
   local for Guest/Demo mode. The firebase dev will replace
   getProfile()/saveProfileData() with Firestore read/write.
   ============================================================ */

// ── Default Guest Groups (mirrors dashboard.js GUEST_GROUPS) ──

const GUEST_GROUPS_DEFAULT = [
  {
    id: 'goa', name: 'Goa Trip 2026',
    members: ['Arif', 'Nadeem', 'Izhaan'],
    createdBy: 'Arif', createdAt: '2026-06-10T10:00:00.000Z',
    expenses: [
      { desc: "Dinner at Ocean's", amount: 3000, payer: 'Arif',   splitWith: ['Arif','Nadeem','Izhaan'], date: '2026-06-16', category: 'food' },
      { desc: 'Uber Ride',         amount: 1500, payer: 'Izhaan', splitWith: ['Arif','Nadeem','Izhaan'], date: '2026-06-15', category: 'transport' },
    ],
  },
  {
    id: 'room', name: 'Room Expenses',
    members: ['Arif', 'Nadeem'],
    createdBy: 'Nadeem', createdAt: '2026-06-01T08:00:00.000Z',
    expenses: [
      { desc: 'Room Rent', amount: 4500, payer: 'Nadeem', splitWith: ['Arif','Nadeem'], date: '2026-06-14', category: 'accommodation' },
    ],
  },
  {
    id: 'office', name: 'Office Lunch',
    members: ['Arif', 'Izhaan', 'Nadeem'],
    createdBy: 'Arif', createdAt: '2026-06-12T12:00:00.000Z',
    expenses: [
      { desc: 'Office Pizza', amount: 950, payer: 'Arif', splitWith: ['Arif','Izhaan','Nadeem'], date: '2026-06-13', category: 'food' },
    ],
  },
];

// ── Default Profile ───────────────────────────────────────────

const DEFAULT_PROFILE = {
  fname: 'Arif',
  lname: 'Karim',
  email: 'arif@example.com',
  phone: '',
  upi:   '',
  bio:   '',
};

// ── Data Helpers ──────────────────────────────────────────────

/**
 * Returns the active groups list — from localStorage if saved,
 * otherwise falls back to the default guest data.
 * @returns {Object[]}
 */
function getGroups() {
  const raw = localStorage.getItem('splitease_guest_groups');
  return raw ? JSON.parse(raw) : GUEST_GROUPS_DEFAULT;
}

/**
 * Returns the saved profile merged with defaults.
 * @returns {Object}
 */
function getProfile() {
  const saved = JSON.parse(localStorage.getItem('splitease_profile') || 'null');
  return saved ? { ...DEFAULT_PROFILE, ...saved } : { ...DEFAULT_PROFILE };
}

// ── Apply Preferences ─────────────────────────────────────────

/**
 * Reads `splitease_settings` from localStorage and applies
 * `.compact-mode` and `.no-animations` classes to the body.
 */
function applyPreferences() {
  try {
    const s = JSON.parse(localStorage.getItem('splitease_settings') || '{}');
    document.body.classList.toggle('compact-mode',  !!s['s-compact']);
    // Animations are ON by default; disable only if explicitly set to false
    document.body.classList.toggle('no-animations', s['s-animations'] === false);
  } catch (e) { /* ignore corrupt storage */ }
}

// ── Sidebar ───────────────────────────────────────────────────

function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('open');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
}

// ── Logout ────────────────────────────────────────────────────

/**
 * Clears guest session and redirects to login.
 * TODO (Dev Firebase): Call signOut(auth) here for real users.
 * @param {Event} e
 */
function handleLogout(e) {
  if (e) e.preventDefault();
  sessionStorage.removeItem('isGuest');
  window.location.href = 'index.html';
}

// ── Toast ─────────────────────────────────────────────────────

/**
 * Shows a brief toast notification at the bottom-right.
 * @param {string}  icon    - Emoji icon
 * @param {string}  msg     - Message text
 * @param {boolean} isError - If true, renders in red
 */
function showProfileToast(icon, msg, isError = false) {
  const t = document.getElementById('p-toast');
  if (!t) return;
  document.getElementById('p-toast-icon').textContent = icon;
  document.getElementById('p-toast-msg').textContent  = msg;
  t.style.borderLeftColor = isError ? 'var(--red)' : 'var(--primary-green)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Load Profile into Form ────────────────────────────────────

function loadProfile() {
  const p = getProfile();

  // Populate each input
  ['fname', 'lname', 'email', 'phone', 'upi', 'bio'].forEach(key => {
    const el = document.getElementById(`inp-${key}`);
    if (el) el.value = p[key] || '';
  });

  _updateDisplayCard(p);
}

/**
 * Updates the avatar card (initials, name, email) from a profile object.
 * @param {Object} p - Profile object
 */
function _updateDisplayCard(p) {
  const fullName = [p.fname, p.lname].filter(Boolean).join(' ');
  const initial  = (p.fname || 'A').charAt(0).toUpperCase();

  const nameEl   = document.getElementById('profile-display-name');
  const emailEl  = document.getElementById('profile-display-email');
  const avatarEl = document.getElementById('avatar-initials');

  if (nameEl)   nameEl.textContent  = fullName || 'User';
  if (emailEl)  emailEl.textContent = p.email  || '';
  if (avatarEl) avatarEl.textContent = initial;
}

// ── Save Profile ──────────────────────────────────────────────

/**
 * Reads form inputs, validates, saves to localStorage, and
 * refreshes the display card. Exposed as window.saveProfile.
 */
function saveProfile() {
  const fname = (document.getElementById('inp-fname')?.value || '').trim();
  const lname = (document.getElementById('inp-lname')?.value || '').trim();
  const phone = (document.getElementById('inp-phone')?.value || '').trim();
  const upi   = (document.getElementById('inp-upi')?.value   || '').trim();
  const bio   = (document.getElementById('inp-bio')?.value   || '').trim();

  // Validate name
  if (!fname) {
    showProfileToast('❌', 'First name cannot be empty.', true);
    document.getElementById('inp-fname')?.focus();
    return;
  }
  if (fname.length < 2) {
    showProfileToast('❌', 'First name must be at least 2 characters.', true);
    document.getElementById('inp-fname')?.focus();
    return;
  }

  // Merge with existing (preserves email which is disabled in the form)
  const existing = getProfile();
  const updated  = { ...existing, fname, lname, phone, upi, bio };
  localStorage.setItem('splitease_profile', JSON.stringify(updated));

  _updateDisplayCard(updated);

  // Button feedback
  const btn = document.getElementById('save-profile-btn');
  if (btn) {
    btn.textContent = 'Saved ✓';
    btn.disabled    = true;
    setTimeout(() => { btn.textContent = 'Save Changes'; btn.disabled = false; }, 2000);
  }

  showProfileToast('✅', 'Profile updated successfully!');
}

// ── Dynamic Stats ─────────────────────────────────────────────

/**
 * Calculates Groups, Expenses, and Total Spent for the current
 * user and updates the three profile stat elements.
 */
function calculateAndRenderStats() {
  const p      = getProfile();
  const me     = p.fname || 'Arif';
  const groups = getGroups();

  // Groups the current user belongs to
  const myGroups = groups.filter(g =>
    g.members.some(m => m.toLowerCase() === me.toLowerCase())
  );

  // All expenses across joined groups
  const allExpenses = myGroups.flatMap(g => g.expenses || []);

  // Expenses the user is involved in (paid or split with)
  const myExpenses = allExpenses.filter(e =>
    e.payer?.toLowerCase() === me.toLowerCase() ||
    (e.splitWith || []).some(m => m.toLowerCase() === me.toLowerCase())
  );

  // Total sum of all group expenses (not just yours)
  const totalSpent = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalFormatted = totalSpent >= 1000
    ? '₹' + (totalSpent / 1000).toFixed(1) + 'k'
    : '₹' + totalSpent.toLocaleString('en-IN');

  // Write to DOM via IDs added in profile.html
  const groupsEl   = document.getElementById('ps-groups');
  const expensesEl = document.getElementById('ps-expenses');
  const totalEl    = document.getElementById('ps-total');

  if (groupsEl)   groupsEl.textContent   = myGroups.length;
  if (expensesEl) expensesEl.textContent = myExpenses.length;
  if (totalEl)    totalEl.textContent    = totalFormatted;
}

// ── Groups Joined Badges ──────────────────────────────────────

/**
 * Dynamically renders group name badges in the left profile card.
 */
function renderGroupsBadges() {
  const container = document.getElementById('groups-badges-container');
  if (!container) return;

  const p        = getProfile();
  const me       = p.fname || 'Arif';
  const groups   = getGroups();
  const myGroups = groups.filter(g =>
    g.members.some(m => m.toLowerCase() === me.toLowerCase())
  );

  if (myGroups.length === 0) {
    container.innerHTML = `<p style="color:var(--muted-gray);font-size:13px;">No groups yet.</p>`;
    return;
  }

  container.innerHTML = myGroups.map(g => `
    <span class="badge" style="background:var(--bg-hover);color:var(--light-gray);border:1px solid var(--border);padding:8px 14px;">
      <span style="width:8px;height:8px;border-radius:50%;background:var(--primary-green);display:inline-block;margin-right:6px;"></span>
      ${g.name}
    </span>
  `).join('');
}

// ── Activity Log ──────────────────────────────────────────────

const ACTIVITY_STYLE = {
  expense: { emoji: '💸', bg: 'rgba(34,197,94,0.1)',   color: 'var(--primary-green)' },
  create:  { emoji: '➕', bg: 'rgba(168,85,247,0.1)',  color: '#A855F7'              },
  join:    { emoji: '🤝', bg: 'rgba(59,130,246,0.1)',  color: '#3B82F6'              },
  payment: { emoji: '💰', bg: 'rgba(245,158,11,0.1)',  color: 'var(--orange)'        },
};

/**
 * Formats a date string to a relative label (Today, Yesterday, N days ago…).
 * @param {string} dateStr
 * @returns {string}
 */
function _relDate(dateStr) {
  const date  = new Date(dateStr);
  const today = new Date();
  const d1    = new Date(date.getFullYear(),  date.getMonth(),  date.getDate());
  const d2    = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff  = Math.floor((d2 - d1) / 86400000);

  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Yesterday';
  if (diff < 7)   return `${diff} days ago`;
  if (diff < 30)  return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Builds a single activity row HTML string.
 */
function _activityRow(type, text, dateStr) {
  const { emoji, bg, color } = ACTIVITY_STYLE[type] || ACTIVITY_STYLE.expense;
  return `
    <div class="activity-row">
      <div class="activity-icon" style="background:${bg};color:${color};">${emoji}</div>
      <div class="activity-text">${text}</div>
      <div class="activity-time">${_relDate(dateStr)}</div>
    </div>`;
}

/**
 * Reads groups/expenses from localStorage and renders a real
 * activity stream in the profile activity card.
 */
function renderActivityLog() {
  const container = document.getElementById('activity-list');
  if (!container) return;

  const p        = getProfile();
  const me       = p.fname || 'Arif';
  const groups   = getGroups();
  const myGroups = groups.filter(g =>
    g.members.some(m => m.toLowerCase() === me.toLowerCase())
  );

  const activities = [];

  myGroups.forEach(g => {
    const amCreator = (g.createdBy || '').toLowerCase() === me.toLowerCase();

    // Group created/joined event
    activities.push({
      type: amCreator ? 'create' : 'join',
      text: amCreator
        ? `You created <strong>${g.name}</strong> group`
        : `You joined <strong>${g.name}</strong> group`,
      date: g.createdAt || new Date().toISOString(),
      ts:   new Date(g.createdAt || 0).getTime(),
    });

    // Expense events
    (g.expenses || []).forEach(e => {
      const isPayer = (e.payer || '').toLowerCase() === me.toLowerCase();
      activities.push({
        type: isPayer ? 'payment' : 'expense',
        text: isPayer
          ? `You paid <strong>₹${(e.amount || 0).toLocaleString('en-IN')}</strong> for <strong>${e.desc}</strong> in ${g.name}`
          : `<strong>${e.desc}</strong> was added to <strong>${g.name}</strong>`,
        date: e.date || new Date().toISOString(),
        ts:   new Date(e.date || 0).getTime(),
      });
    });
  });

  // Sort newest first, keep top 5
  activities.sort((a, b) => b.ts - a.ts);
  const recent = activities.slice(0, 5);

  container.innerHTML = recent.length > 0
    ? recent.map(a => _activityRow(a.type, a.text, a.date)).join('')
    : `<div style="padding:24px;text-align:center;color:var(--muted-gray);font-size:13px;">No recent activity yet.</div>`;
}

// ── Expose to window (for inline onclick handlers in HTML) ────

window.saveProfile  = saveProfile;
window.openSidebar  = openSidebar;
window.closeSidebar = closeSidebar;
window.handleLogout = handleLogout;

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  applyPreferences();
  loadProfile();
  calculateAndRenderStats();
  renderGroupsBadges();
  renderActivityLog();
});
