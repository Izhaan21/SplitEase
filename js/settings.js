/* ============================================================
   settings.js  —  SplitEase  |  dev-logic
   Handles: tab switching, localStorage settings persistence,
            compact mode / animations class application,
            change password validation (mock for Guest mode),
            2FA badge toggle, and all Danger Zone actions.

   Firebase Note: Danger zone actions operate on localStorage
   for Guest/Demo mode. The firebase dev will add Firestore
   deletions / signOut calls at each TODO comment below.
   ============================================================ */

// ── Apply Preferences ─────────────────────────────────────────

/**
 * Reads `splitease_settings` from localStorage and applies
 * `.compact-mode` and `.no-animations` classes to `<body>`.
 * Called on every page load and after each Save.
 */
function applyPreferences() {
  try {
    const s = JSON.parse(localStorage.getItem('splitease_settings') || '{}');
    document.body.classList.toggle('compact-mode',  !!s['s-compact']);
    // Default is animations ON; disable only if explicitly false
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
 * TODO (Dev Firebase): Also call signOut(auth) for real users.
 * @param {Event} e
 */
function handleLogout(e) {
  if (e) e.preventDefault();
  sessionStorage.removeItem('isGuest');
  window.location.href = 'index.html';
}

// ── Tab Switching ─────────────────────────────────────────────

/**
 * Shows the settings panel for the given tab name and marks
 * the corresponding nav item as active.
 * @param {string} name  - e.g. 'general', 'notifications', 'privacy', 'danger'
 */
function showTab(name) {
  document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name)?.classList.add('active');
  document.getElementById('nav-' + name)?.classList.add('active');
}

// ── Toast ─────────────────────────────────────────────────────

/**
 * Shows a brief toast notification at the bottom-right.
 * @param {string}  icon    - Emoji icon
 * @param {string}  msg     - Message text
 * @param {boolean} isError - If true, renders in red
 */
function showToast(icon, msg, isError = false) {
  const t = document.getElementById('s-toast');
  if (!t) return;
  document.getElementById('s-toast-icon').textContent = icon;
  document.getElementById('s-toast-msg').textContent  = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Modal Open / Close ────────────────────────────────────────

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// ── Settings Load from localStorage ──────────────────────────

/**
 * Reads all saved settings from `splitease_settings` in
 * localStorage and populates the UI controls.
 */
function loadSettings() {
  const s = JSON.parse(localStorage.getItem('splitease_settings') || '{}');

  // Dropdowns
  const selectors = {
    language:   's-language',
    dateformat: 's-dateformat',
    theme:      's-theme',
  };
  Object.entries(selectors).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el && s[key] !== undefined) el.value = s[key];
  });

  // Toggle checkboxes
  const toggleIds = [
    's-compact', 's-animations',
    'n-new-expense', 'n-settlement', 'n-invite', 'n-payment',
    'e-weekly', 'e-monthly', 'e-updates',
    'p-balance', 'p-photo', 'p-activity', 'p-2fa',
  ];
  toggleIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && s[id] !== undefined) el.checked = s[id];
  });

  updateTFABadge();
}

// ── Settings Save to localStorage ────────────────────────────

/**
 * Collects all toggle and select values and persists them in
 * localStorage, then immediately applies visual preferences.
 */
function saveSettings() {
  const s = {};

  // Dropdowns
  ['s-language', 's-dateformat', 's-theme'].forEach(id => {
    const el = document.getElementById(id);
    if (el) s[id.replace('s-', '')] = el.value;
  });
  // Fix: use full key for language/dateformat/theme
  const langEl  = document.getElementById('s-language');
  const dateEl  = document.getElementById('s-dateformat');
  const themeEl = document.getElementById('s-theme');
  if (langEl)  s['language']   = langEl.value;
  if (dateEl)  s['dateformat'] = dateEl.value;
  if (themeEl) s['theme']      = themeEl.value;

  // Toggles
  [
    's-compact', 's-animations',
    'n-new-expense', 'n-settlement', 'n-invite', 'n-payment',
    'e-weekly', 'e-monthly', 'e-updates',
    'p-balance', 'p-photo', 'p-activity', 'p-2fa',
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) s[id] = el.checked;
  });

  localStorage.setItem('splitease_settings', JSON.stringify(s));

  // Instantly apply compact mode and animations preference
  applyPreferences();
}

// ── Section Save Handlers ─────────────────────────────────────

function saveGeneral() {
  saveSettings();
  const btn = document.getElementById('btn-save-general');
  if (btn) {
    btn.textContent = 'Saved ✓';
    setTimeout(() => { btn.textContent = 'Save Changes'; }, 2000);
  }
  showToast('✅', 'General settings saved!');
}

function saveNotifications() {
  saveSettings();
  const btn = document.getElementById('btn-save-notif');
  if (btn) {
    btn.textContent = 'Saved ✓';
    setTimeout(() => { btn.textContent = 'Save Changes'; }, 2000);
  }
  showToast('🔔', 'Notification preferences saved!');
}

function savePrivacy() {
  saveSettings();
  const btn = document.getElementById('btn-save-privacy');
  if (btn) {
    btn.textContent = 'Saved ✓';
    setTimeout(() => { btn.textContent = 'Save Changes'; }, 2000);
  }
  showToast('🔒', 'Privacy & security settings saved!');
}

function resetGeneral() {
  const compact   = document.getElementById('s-compact');
  const anim      = document.getElementById('s-animations');
  const lang      = document.getElementById('s-language');
  const dateFmt   = document.getElementById('s-dateformat');
  const theme     = document.getElementById('s-theme');

  if (compact) compact.checked = false;
  if (anim)    anim.checked    = true;
  if (lang)    lang.value      = 'en';
  if (dateFmt) dateFmt.value   = 'dmy';
  if (theme)   theme.value     = 'dark';

  saveSettings();
  showToast('🔄', 'Settings reset to default.');
}

// ── Change Password (validation only — no Firebase here) ──────

/**
 * Validates the change-password modal fields and shows a
 * success toast on pass. Leaves all Firebase calls to dev-firebase.
 *
 * TODO (Dev Firebase): Replace the close/toast block with
 *   reauthenticateWithCredential(auth.currentUser, credential)
 *   .then(() => updatePassword(auth.currentUser, newPassword))
 */
function changePassword() {
  const cur  = (document.getElementById('pw-current')?.value  || '').trim();
  const nw   = document.getElementById('pw-new')?.value       || '';
  const conf = document.getElementById('pw-confirm')?.value   || '';

  // Validation
  if (!cur)           { showToast('❌', 'Please enter your current password.', true); return; }
  if (nw.length < 6)  { showToast('❌', 'New password must be at least 6 characters.', true); return; }
  if (nw !== conf)    { showToast('❌', 'New passwords do not match.', true); return; }

  // Clear and close
  closeModal('modal-password');
  ['pw-current', 'pw-new', 'pw-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  showToast('🔑', 'Password updated successfully!');
}

// ── 2FA Toggle ────────────────────────────────────────────────

function toggle2FA() {
  saveSettings();
  updateTFABadge();
  const on = document.getElementById('p-2fa')?.checked;
  showToast(on ? '🔐' : '🔓', on ? 'Two-factor authentication enabled.' : '2FA has been disabled.');
}

/**
 * Updates the ON / OFF badge next to the 2FA toggle.
 */
function updateTFABadge() {
  const on    = document.getElementById('p-2fa')?.checked;
  const badge = document.getElementById('tfa-badge');
  if (!badge) return;
  badge.textContent = on ? 'ON' : 'OFF';
  badge.className   = 'badge ' + (on ? 'badge-success' : 'badge-danger');
}

// ── Danger Zone ───────────────────────────────────────────────

let _dangerAction = null;

/**
 * Opens the danger confirmation modal pre-filled with the
 * specific action details.
 * @param {'clear'|'leave'|'delete'} action
 * @param {string} icon
 * @param {string} title
 * @param {string} sub
 */
function confirmDanger(action, icon, title, sub) {
  _dangerAction = action;
  const iconEl  = document.getElementById('danger-icon');
  const titleEl = document.getElementById('danger-title');
  const subEl   = document.getElementById('danger-sub');
  const inputEl = document.getElementById('danger-confirm-input');

  if (iconEl)  iconEl.textContent  = icon;
  if (titleEl) titleEl.textContent = title;
  if (subEl)   subEl.textContent   = sub;
  if (inputEl) inputEl.value       = '';

  openModal('modal-danger');
}

/**
 * Executes the danger action after the user types "CONFIRM".
 * Routes to the correct internal handler.
 */
function executeDanger() {
  const val = (document.getElementById('danger-confirm-input')?.value || '')
    .trim().toUpperCase();

  if (val !== 'CONFIRM') {
    showToast('❌', 'Type CONFIRM (in caps) to proceed.', true);
    return;
  }

  closeModal('modal-danger');

  switch (_dangerAction) {
    case 'clear':  _clearExpenseHistory(); break;
    case 'leave':  _leaveAllGroups();      break;
    case 'delete': _deleteAccount();       break;
    default:       showToast('✅', 'Done.');
  }

  _dangerAction = null;
}

// ── Danger: Clear Expense History ─────────────────────────────

/**
 * Wipes expenses from every guest group in localStorage.
 * On the dashboard, groups will re-render with 0 expenses.
 */
function _clearExpenseHistory() {
  const raw = localStorage.getItem('splitease_guest_groups');
  let groups;

  if (raw) {
    groups = JSON.parse(raw);
    groups.forEach(g => { g.expenses = []; });
  } else {
    // Write cleared version of the defaults so dashboard picks it up
    groups = [
      { id: 'goa',    name: 'Goa Trip 2026',  members: ['Arif','Nadeem','Izhaan'], createdBy: 'Arif',   createdAt: '2026-06-10T10:00:00.000Z', expenses: [], status: 'settled' },
      { id: 'room',   name: 'Room Expenses',  members: ['Arif','Nadeem'],           createdBy: 'Nadeem', createdAt: '2026-06-01T08:00:00.000Z', expenses: [], status: 'pending' },
      { id: 'office', name: 'Office Lunch',   members: ['Arif','Izhaan','Nadeem'],  createdBy: 'Arif',   createdAt: '2026-06-12T12:00:00.000Z', expenses: [], status: 'pending' },
    ];
  }

  localStorage.setItem('splitease_guest_groups', JSON.stringify(groups));

  // TODO (Dev Firebase): Batch delete all expense subcollections in Firestore here.
  showToast('🗑️', 'All expense history has been cleared.');
}

// ── Danger: Leave All Groups ──────────────────────────────────

/**
 * Removes the current user from the `members` array of every
 * group in localStorage.
 */
function _leaveAllGroups() {
  const profile = JSON.parse(localStorage.getItem('splitease_profile') || '{}');
  const me = (profile.fname || 'Arif').toLowerCase();

  const raw    = localStorage.getItem('splitease_guest_groups');
  const groups = raw ? JSON.parse(raw) : [];

  groups.forEach(g => {
    g.members = (g.members || []).filter(m => m.toLowerCase() !== me);
  });

  localStorage.setItem('splitease_guest_groups', JSON.stringify(groups));

  // TODO (Dev Firebase): Use arrayRemove on each group's members field in Firestore here.
  showToast('👋', 'You have been removed from all groups.');
}

// ── Danger: Delete Account ────────────────────────────────────

/**
 * Clears all `splitease_*` keys from localStorage, removes
 * the guest session flag, then redirects to the login page.
 */
function _deleteAccount() {
  // Clear all app data from localStorage
  Object.keys(localStorage)
    .filter(k => k.startsWith('splitease_'))
    .forEach(k => localStorage.removeItem(k));

  sessionStorage.removeItem('isGuest');

  // TODO (Dev Firebase): delete(auth.currentUser) here, then
  //   delete the /users/{uid} Firestore document.

  showToast('💀', 'Account deleted. Redirecting…');
  setTimeout(() => { window.location.href = 'index.html'; }, 1500);
}

// ── Export Data ───────────────────────────────────────────────

/**
 * Builds a JSON export file from real localStorage data and
 * triggers a browser download.
 */
function exportData() {
  const settings = JSON.parse(localStorage.getItem('splitease_settings') || '{}');
  const profile  = JSON.parse(localStorage.getItem('splitease_profile')  || '{}');
  const rawGroups = localStorage.getItem('splitease_guest_groups');

  const groups = rawGroups ? JSON.parse(rawGroups) : [
    { name: 'Goa Trip 2026',  members: ['Arif','Nadeem','Izhaan'], expenses: [] },
    { name: 'Room Expenses',  members: ['Arif','Nadeem'],           expenses: [] },
    { name: 'Office Lunch',   members: ['Arif','Izhaan','Nadeem'],  expenses: [] },
  ];

  const payload = {
    exported: new Date().toISOString(),
    user: {
      name:  [profile.fname, profile.lname].filter(Boolean).join(' ') || 'Arif Karim',
      email: profile.email || 'arif@example.com',
      phone: profile.phone || '',
      upi:   profile.upi   || '',
    },
    settings,
    groups,
    note: 'In production, full Firestore data will be included here.',
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `splitease_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  showToast('⬇️', 'Data exported successfully!');
}

// ── Expose to window (for inline onclick handlers in HTML) ────

window.showTab           = showTab;
window.showToast         = showToast;
window.openModal         = openModal;
window.closeModal        = closeModal;
window.saveSettings      = saveSettings;
window.saveGeneral       = saveGeneral;
window.saveNotifications = saveNotifications;
window.savePrivacy       = savePrivacy;
window.resetGeneral      = resetGeneral;
window.changePassword    = changePassword;
window.toggle2FA         = toggle2FA;
window.updateTFABadge    = updateTFABadge;
window.confirmDanger     = confirmDanger;
window.executeDanger     = executeDanger;
window.exportData        = exportData;
window.openSidebar       = openSidebar;
window.closeSidebar      = closeSidebar;
window.handleLogout      = handleLogout;

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  applyPreferences();
  loadSettings();

  // Close any open modal on Escape key
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open')
        .forEach(m => m.classList.remove('open'));
    }
  });

  // Close modal when clicking the backdrop
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => {
      if (e.target === m) m.classList.remove('open');
    });
  });
});
