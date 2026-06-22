/* ============================================================
   settings.js  —  SplitEase  |  dev-firebase
   Handles: tab switching, localStorage settings persistence,
            compact mode / animations class application,
            change password validation and updates via Firebase Auth,
            2FA badge toggle, and all Danger Zone actions.
   ============================================================ */

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser
} from "firebase/auth";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  deleteDoc
} from "firebase/firestore";

let CURRENT_USER = '';

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
 * Clears session and redirects to login.
 * @param {Event} e
 */
function handleLogout(e) {
  if (e) e.preventDefault();
  signOut(auth)
    .then(() => {
      window.location.href = 'index.html';
    })
    .catch(err => {
      console.error("Signout failed:", err);
      window.location.href = 'index.html';
    });
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

// ── Change Password ───────────────────────────────────────────

/**
 * Validates password fields and updates the user's password via Firebase Auth.
 */
function changePassword() {
  const cur  = (document.getElementById('pw-current')?.value  || '').trim();
  const nw   = document.getElementById('pw-new')?.value       || '';
  const conf = document.getElementById('pw-confirm')?.value   || '';

  // Validation
  if (!cur)           { showToast('❌', 'Please enter your current password.', true); return; }
  if (nw.length < 6)  { showToast('❌', 'New password must be at least 6 characters.', true); return; }
  if (nw !== conf)    { showToast('❌', 'New passwords do not match.', true); return; }

  const user = auth.currentUser;
  if (!user) {
    showToast('❌', 'No user logged in.', true);
    return;
  }

  const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
  if (isGoogle) {
    showToast('❌', 'Google sign-in users cannot update password here.', true);
    return;
  }

  const credential = EmailAuthProvider.credential(user.email, cur);
  
  reauthenticateWithCredential(user, credential)
    .then(() => {
      return updatePassword(user, nw);
    })
    .then(() => {
      closeModal('modal-password');
      ['pw-current', 'pw-new', 'pw-confirm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      showToast('🔑', 'Password updated successfully!');
    })
    .catch(err => {
      console.error("Password update error:", err);
      showToast('❌', 'Failed to update password: ' + err.message, true);
    });
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
 * Wipes expenses from group documents where current user is payer.
 */
function _clearExpenseHistory() {
  const user = auth.currentUser;
  if (!user) return;

  // Get all groups containing user
  const groupsQuery = query(
    collection(db, "groups"),
    where("members", "array-contains", CURRENT_USER)
  );

  getDocs(groupsQuery)
    .then(snapshot => {
      const promises = [];
      snapshot.forEach(groupDoc => {
        const groupId = groupDoc.id;
        const expensesQuery = query(
          collection(db, "groups", groupId, "expenses"),
          where("payer", "==", CURRENT_USER)
        );

        const p = getDocs(expensesQuery).then(expSnap => {
          const batch = writeBatch(db);
          expSnap.forEach(expDoc => {
            batch.delete(expDoc.ref);
          });
          return batch.commit();
        });
        promises.push(p);
      });
      return Promise.all(promises);
    })
    .then(() => {
      showToast('🗑️', 'All your recorded expenses have been cleared.');
    })
    .catch(err => {
      console.error("Error clearing expenses:", err);
      showToast('❌', 'Failed to clear expenses.', true);
    });
}

// ── Danger: Leave All Groups ──────────────────────────────────

/**
 * Removes the current user from the `members` array of every group.
 */
function _leaveAllGroups() {
  const user = auth.currentUser;
  if (!user) return;

  const groupsQuery = query(
    collection(db, "groups"),
    where("members", "array-contains", CURRENT_USER)
  );

  getDocs(groupsQuery)
    .then(snapshot => {
      const batch = writeBatch(db);
      snapshot.forEach(groupDoc => {
        const members = groupDoc.data().members || [];
        const updatedMembers = members.filter(m => m.toLowerCase() !== CURRENT_USER.toLowerCase());
        batch.update(groupDoc.ref, { members: updatedMembers });
      });
      return batch.commit();
    })
    .then(() => {
      showToast('👋', 'You have been removed from all groups.');
    })
    .catch(err => {
      console.error("Error leaving groups:", err);
      showToast('❌', 'Failed to leave groups.', true);
    });
}

// ── Danger: Delete Account ────────────────────────────────────

/**
 * Deletes user profile data, removes them from all groups, then deletes the auth account.
 */
function _deleteAccount() {
  const user = auth.currentUser;
  if (!user) return;

  // 1. Leave all groups
  const groupsQuery = query(
    collection(db, "groups"),
    where("members", "array-contains", CURRENT_USER)
  );

  let groupPromise = getDocs(groupsQuery)
    .then(snapshot => {
      const batch = writeBatch(db);
      snapshot.forEach(groupDoc => {
        const members = groupDoc.data().members || [];
        const updatedMembers = members.filter(m => m.toLowerCase() !== CURRENT_USER.toLowerCase());
        batch.update(groupDoc.ref, { members: updatedMembers });
      });
      return batch.commit();
    });

  // 2. Delete user profile
  const userRef = doc(db, "users", user.uid);
  let userDocPromise = deleteDoc(userRef);

  Promise.all([groupPromise, userDocPromise])
    .then(() => {
      // 3. Delete Auth account
      return deleteUser(user);
    })
    .then(() => {
      showToast('💀', 'Account deleted. Redirecting…');
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    })
    .catch(err => {
      console.error("Error deleting account:", err);
      if (err.code === 'auth/requires-recent-login') {
        showToast('❌', 'Action requires a recent login. Please sign out and sign in again.', true);
      } else {
        showToast('❌', 'Failed to delete account: ' + err.message, true);
      }
    });
}

// ── Export Data ───────────────────────────────────────────────

/**
 * Builds a JSON export file and triggers a browser download.
 */
function exportData() {
  const user = auth.currentUser;
  if (!user) return;

  const btn = document.querySelector('[onclick="exportData()"]');
  if (btn) btn.disabled = true;

  // Get groups
  const groupsQuery = query(
    collection(db, "groups"),
    where("members", "array-contains", CURRENT_USER)
  );

  getDocs(groupsQuery)
    .then(snapshot => {
      const groupPromises = [];
      snapshot.forEach(groupDoc => {
        const gData = groupDoc.data();
        const groupId = groupDoc.id;
        const expensesQuery = collection(db, "groups", groupId, "expenses");
        
        const p = getDocs(expensesQuery).then(expSnap => {
          const expenses = [];
          expSnap.forEach(expDoc => {
            const eData = expDoc.data();
            expenses.push({
              desc: eData.desc,
              amount: eData.amount,
              payer: eData.payer,
              splitWith: eData.splitWith || [],
              date: eData.date ? (eData.date.toDate ? eData.date.toDate().toISOString() : eData.date) : ''
            });
          });
          return {
            id: groupId,
            name: gData.name,
            members: gData.members || [],
            expenses
          };
        });
        groupPromises.push(p);
      });
      return Promise.all(groupPromises);
    })
    .then(groupsData => {
      const settings = JSON.parse(localStorage.getItem('splitease_settings') || '{}');
      const payload = {
        exported: new Date().toISOString(),
        user: {
          name: user.displayName || CURRENT_USER,
          email: user.email,
          uid: user.uid
        },
        settings,
        groups: groupsData
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `splitease_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      showToast('⬇️', 'Data exported successfully!');
      if (btn) btn.disabled = false;
    })
    .catch(err => {
      console.error("Export failed:", err);
      showToast('❌', 'Data export failed.', true);
      if (btn) btn.disabled = false;
    });
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

  onAuthStateChanged(auth, (user) => {
    if (user) {
      CURRENT_USER = user.displayName || user.email.split('@')[0];
    } else {
      window.location.href = 'index.html';
    }
  });

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
