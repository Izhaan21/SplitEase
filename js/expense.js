import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

/* ============================================================
   expense.js  —  SplitEase  |  dev-logic
   DAY 3 — Nadeem (dev-logic)
   Handles: group selection, member chips, split preview,
            form validation, expense object construction,
            real-time Firestore group fetching and expense writing
   ============================================================ */

// ── Dynamic Group → Members Map ───────────────────────────────
let GROUP_MEMBERS = {};
let GROUPS_CACHE = []; // Stores the loaded groups for easy lookup
let CURRENT_USER = 'Guest';

// Mock data for Guest mode
const GUEST_GROUP_MEMBERS = {
  goa:    ['Arif', 'Nadeem', 'Izhaan'],
  room:   ['Arif', 'Nadeem'],
  office: ['Arif', 'Izhaan', 'Nadeem'],
};

// ── Step Indicator Tracker ────────────────────────────────────
const stepState = { 1: false, 2: false, 3: false, 4: false };

function markStep(n, done) {
  stepState[n] = done;
  const dot = document.getElementById(`step-dot-${n}`);
  if (dot) dot.classList.toggle('done', done);
}

// ── Set default date ──────────────────────────────────────────

function setDefaultDate() {
  const el = document.getElementById('expense-date');
  if (el) el.value = new Date().toISOString().split('T')[0];
}

// ── Pre-select Group from Dashboard ───────────────────────────

function preSelectGroup() {
  const saved = sessionStorage.getItem('selectedGroup');
  if (!saved) return;

  const sel = document.getElementById('expense-group');
  if (!sel) return;

  // Search by option text
  for (const opt of sel.options) {
    if (opt.text === saved) {
      opt.selected = true;
      break;
    }
  }
  onGroupChange();
}

// ── Group Change Handler ──────────────────────────────────────

/**
 * Called when the user picks a group from the dropdown.
 * Populates the "Paid By" dropdown and the member chip grid.
 */
function onGroupChange() {
  const groupVal = document.getElementById('expense-group').value;
  const members  = GROUP_MEMBERS[groupVal] || [];

  // Clear any previous error
  clearFormError();

  // Populate "Paid By" dropdown
  const payerEl = document.getElementById('expense-payer');
  payerEl.innerHTML = '<option value="" disabled selected>Who paid?</option>';
  members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    payerEl.appendChild(opt);
  });

  // Render member chips (all checked by default)
  const grid = document.getElementById('members-grid');
  grid.innerHTML = '';

  const AVATAR_COLORS = ['#22C55E', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];

  if (members.length === 0) {
    grid.innerHTML = `<p style="color:var(--muted-gray);font-size:13px;grid-column:1/-1;">
      Select a group above to see members.</p>`;
  } else {
    members.forEach((m, i) => {
      const label = document.createElement('label');
      label.className = 'member-chip checked';
      label.innerHTML = `
        <input type="checkbox" name="member" value="${m}" checked onchange="window.onMemberToggle(this)" />
        <div class="member-chip-avatar" style="background:${AVATAR_COLORS[i % AVATAR_COLORS.length]}">
          ${m.charAt(0).toUpperCase()}
        </div>
        <span class="member-chip-name">${m}</span>
        <span class="member-chip-check">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </span>`;
      grid.appendChild(label);
    });
  }

  markStep(1, true);
  markStep(2, true);
  updateSplitPreview();
}

// ── Member Chip Toggle ────────────────────────────────────────

function onMemberToggle(checkbox) {
  const chip = checkbox.closest('.member-chip');
  chip.classList.toggle('checked', checkbox.checked);
  updateSplitPreview();
  markStep(3, checkedMembers().length > 0);
}

/** Returns array of currently checked member names */
function checkedMembers() {
  return [...document.querySelectorAll('input[name="member"]:checked')]
    .map(c => c.value);
}

// ── Live Split Preview ────────────────────────────────────────

function updateSplitPreview() {
  const amount  = parseFloat(document.getElementById('expense-amount').value) || 0;
  const members = checkedMembers();
  const preview = document.getElementById('split-preview');

  if (amount > 0 && members.length > 0) {
    const each = (amount / members.length).toFixed(2);
    document.getElementById('per-person-amount').textContent = `₹${parseFloat(each).toLocaleString('en-IN')}`;
    preview.style.display = 'flex';
  } else {
    preview.style.display = 'none';
  }
}

// ── Auto Category Detection ──────────────────────────────────

/**
 * Detects the most likely expense category from a description string.
 * Used to auto-fill the category dropdown as the user types.
 *
 * @param {string} desc
 * @returns {string} category key
 */
const CATEGORY_KEYWORDS = {
  food:          ['food', 'lunch', 'dinner', 'breakfast', 'eat', 'restaurant', 'cafe', 'pizza', 'biryani', 'snack', 'swiggy', 'zomato', 'tea', 'coffee'],
  transport:     ['uber', 'ola', 'cab', 'auto', 'bus', 'train', 'fuel', 'petrol', 'metro', 'ride', 'taxi', 'flight', 'ticket', 'travel'],
  accommodation: ['hotel', 'hostel', 'rent', 'room', 'airbnb', 'stay', 'lodge', 'booking', 'pg', 'flat'],
  shopping:      ['shopping', 'clothes', 'shirt', 'shoes', 'amazon', 'flipkart', 'mall', 'grocery', 'market', 'buy'],
  entertainment: ['movie', 'film', 'concert', 'game', 'show', 'club', 'party', 'netflix', 'ticket', 'sport', 'cricket'],
  utilities:     ['electricity', 'water', 'gas', 'wifi', 'internet', 'mobile', 'recharge', 'bill', 'repair', 'maintenance'],
};

function detectCategory(desc) {
  const lower = desc.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return 'other';
}

// ── Form Validation ───────────────────────────────────────────

/**
 * Runs full validation on the expense form.
 * Returns a clean expense object on success, null on failure.
 * Each failure highlights the offending field and shows an inline error.
 *
 * @returns {Object|null}
 */
function validateExpenseForm() {
  const groupEl  = document.getElementById('expense-group');
  const nameEl   = document.getElementById('expense-name');
  const amtEl    = document.getElementById('expense-amount');
  const payerEl  = document.getElementById('expense-payer');
  const dateEl   = document.getElementById('expense-date');
  const catEl    = document.getElementById('expense-category');
  const notesEl  = document.getElementById('expense-notes');

  const group    = groupEl?.value  || '';
  const name     = nameEl?.value.trim()  || '';
  const amtRaw   = amtEl?.value  || '';
  const amount   = parseFloat(amtRaw);
  const payer    = payerEl?.value  || '';
  const date     = dateEl?.value  || '';
  const category = catEl?.value   || 'other';
  const notes    = notesEl?.value.trim() || '';
  const members  = checkedMembers();

  // Ordered validation — fail on first error
  if (!group)                         return fail('Please select a group first.', groupEl);
  if (!name)                          return fail('Please enter an expense name.', nameEl);
  if (name.length < 2)                return fail('Expense name must be at least 2 characters.', nameEl);
  if (!amtRaw)                        return fail('Please enter the total amount.', amtEl);
  if (isNaN(amount) || amount <= 0)   return fail('Amount must be a valid number greater than ₹0.', amtEl);
  if (amount > 10_00_000)             return fail('Amount looks too large (max ₹10,00,000). Please check.', amtEl);
  if (!payer)                         return fail('Please select who paid.', payerEl);
  if (!date)                          return fail('Please pick a date.', dateEl);
  if (members.length === 0)           return fail('Select at least one member to split with.');

  // Safe per-person calculation (avoids floating-point drift)
  const perPerson = Math.round((amount / members.length) * 100) / 100;

  // Auto-detect category if user left it as 'other'
  const resolvedCategory = (category === 'other' && name) ? detectCategory(name) : category;
  if (catEl && resolvedCategory !== category) catEl.value = resolvedCategory;

  return { group, desc: name, amount, payer, splitWith: members, perPerson, category: resolvedCategory, notes, date };
}

/**
 * Helper: shows an error and optionally highlights the offending field.
 * @param {string}          msg
 * @param {HTMLElement|null} fieldEl
 * @returns {null}
 */
function fail(msg, fieldEl = null) {
  showFormError(msg);
  if (fieldEl) {
    fieldEl.classList.add('field-error');
    fieldEl.focus();
    // Auto-clear highlight when user corrects the field
    fieldEl.addEventListener('input', () => fieldEl.classList.remove('field-error'), { once: true });
    fieldEl.addEventListener('change', () => fieldEl.classList.remove('field-error'), { once: true });
  }
  return null;
}

// ── Error Display ─────────────────────────────────────────────

function showFormError(msg) {
  const box = document.getElementById('expense-form-error');
  if (!box) { alert(msg); return; }
  box.textContent = msg;
  box.classList.add('show');
  // Smooth scroll only if the box is out of view
  const rect = box.getBoundingClientRect();
  if (rect.top < 0 || rect.bottom > window.innerHeight) {
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ── Clear Form Errors ─────────────────────────────────────────

function clearFormError() {
  const box = document.getElementById('expense-form-error');
  if (box) { box.textContent = ''; box.classList.remove('show'); }
  // Clear any field-level highlights
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
}

// ── Form Submit ───────────────────────────────────────────────

/**
 * Handles the expense form submission.
 * Validates, builds the expense object, then saves to Firestore (or local for Guest).
 * Shows loading state on button, restores it on error.
 *
 * @param {Event} e
 */
function handleSubmit(e) {
  e.preventDefault();
  clearFormError();

  const expense = validateExpenseForm();
  if (!expense) return;

  markStep(3, true);
  markStep(4, true);

  // Show loading state on submit button
  const btn = document.getElementById('submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  const isGuest = sessionStorage.getItem('isGuest') === 'true';

  if (isGuest) {
    // Simulate a short save delay for better UX
    setTimeout(() => showSuccessToast(), 600);
  } else {
    const groupRef = doc(db, 'groups', expense.group);
    addDoc(collection(groupRef, 'expenses'), {
      desc:      expense.desc,
      amount:    expense.amount,
      payer:     expense.payer,
      splitWith: expense.splitWith,
      perPerson: expense.perPerson,
      category:  expense.category,
      notes:     expense.notes,
      date:      Timestamp.fromDate(new Date(expense.date + 'T00:00:00')),
      createdAt: serverTimestamp(),
    })
    .then(() => {
      showSuccessToast();
    })
    .catch(err => {
      console.error('Error saving expense:', err);
      // Restore button so user can retry
      if (btn) { btn.disabled = false; btn.textContent = 'Add Expense'; }
      showFormError('Failed to save. Check your connection and try again.');
    });
  }
}

// ── Success Toast ─────────────────────────────────────────────

function showSuccessToast() {
  const btn   = document.getElementById('submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  const toast = document.getElementById('toast');
  if (toast) toast.classList.add('show');

  setTimeout(() => {
    if (toast) toast.classList.remove('show');
    sessionStorage.removeItem('selectedGroup');
    window.location.href = 'dashboard.html';
  }, 2000);
}

// ── Populate Groups dropdown dynamically ───────────────────────

function populateGroupsDropdown() {
  const groupSelect = document.getElementById('expense-group');
  if (!groupSelect) return;

  // Clear existing hardcoded groups, keeping the first placeholder option
  groupSelect.innerHTML = '<option value="" disabled selected>Select a group…</option>';

  GROUPS_CACHE.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    groupSelect.appendChild(opt);
  });

  // Re-run preSelectGroup in case we navigated from dashboard
  preSelectGroup();
}

function initFirebaseSync(user) {
  CURRENT_USER = user.displayName || user.email.split('@')[0];

  // Fetch groups where user is a member
  const groupsQuery = query(
    collection(db, "groups"),
    where("members", "array-contains", CURRENT_USER)
  );

  onSnapshot(groupsQuery, (snapshot) => {
    GROUPS_CACHE = [];
    GROUP_MEMBERS = {};

    snapshot.forEach(docSnap => {
      const gData = docSnap.data();
      const groupId = docSnap.id;
      
      GROUPS_CACHE.push({
        id: groupId,
        name: gData.name
      });
      GROUP_MEMBERS[groupId] = gData.members || [];
    });

    populateGroupsDropdown();
  }, (error) => {
    console.error("Error fetching groups for dropdown:", error);
  });
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      initFirebaseSync(user);
    } else {
      if (sessionStorage.getItem('isGuest') === 'true') {
        CURRENT_USER = 'Arif';
        // Map guest groups
        GROUPS_CACHE = [
          { id: 'goa', name: 'Goa Trip 2026' },
          { id: 'room', name: 'Room Expenses' },
          { id: 'office', name: 'Office Lunch' }
        ];
        GROUP_MEMBERS = GUEST_GROUP_MEMBERS;
        populateGroupsDropdown();
      } else {
        window.location.href = 'index.html';
      }
    }
  });
});

// Expose handlers to window for HTML inline events
window.onGroupChange = onGroupChange;
window.onMemberToggle = onMemberToggle;
window.updateSplitPreview = updateSplitPreview;
window.handleSubmit = handleSubmit;
