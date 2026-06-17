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
   expense.js  —  SplitEase  |  dev-firebase
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
  goa: ['Arif', 'Nadeem', 'Izhaan'],
  room: ['Arif', 'Nadeem'],
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
  const members = GROUP_MEMBERS[groupVal] || [];

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
  const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
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

// ── Form Validation ───────────────────────────────────────────

function validateExpenseForm() {
  const group = document.getElementById('expense-group').value;
  const name = document.getElementById('expense-name').value.trim();
  const amountRaw = document.getElementById('expense-amount').value;
  const amount = parseFloat(amountRaw);
  const payer = document.getElementById('expense-payer').value;
  const date = document.getElementById('expense-date').value;
  const members = checkedMembers();
  const notes = document.getElementById('expense-notes').value.trim();
  const category = document.getElementById('expense-category').value;

  if (!group) return fail('Please select a group.');
  if (!name) return fail('Please enter an expense name.');
  if (name.length < 2) return fail('Expense name must be at least 2 characters.');
  if (!amountRaw) return fail('Please enter the total amount.');
  if (isNaN(amount) || amount <= 0) return fail('Please enter a valid amount greater than 0.');
  if (amount > 1_000_000) return fail('Amount seems too large. Please double-check.');
  if (!payer) return fail('Please select who paid.');
  if (!date) return fail('Please select a date.');
  if (members.length === 0) return fail('Please select at least one member to split with.');

  return {
    group,
    desc: name,
    amount: +amount.toFixed(2),
    payer,
    splitWith: members,
    perPerson: +(amount / members.length).toFixed(2),
    category,
    notes,
    date,
  };
}

function fail(msg) {
  showFormError(msg);
  return null;
}

// ── Error Display ─────────────────────────────────────────────

function showFormError(msg) {
  let box = document.getElementById('expense-form-error');
  if (!box) {
    alert(msg);
    return;
  }
  box.textContent = msg;
  box.classList.add('show');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Clear Form Error ──────────────────────────────────────────

function clearFormError() {
  const box = document.getElementById('expense-form-error');
  if (box) { box.textContent = ''; box.classList.remove('show'); }
}

// ── Form Submit ───────────────────────────────────────────────

function handleSubmit(e) {
  e.preventDefault();
  clearFormError();

  const expense = validateExpenseForm();
  if (!expense) return;

  markStep(3, true);
  markStep(4, true);

  const isGuest = sessionStorage.getItem('isGuest') === 'true';

  if (isGuest) {
    console.log('✅ Guest Expense saved locally:', expense);
    showSuccessToast();
  } else {
    // Save to Firestore
    const groupRef = doc(db, "groups", expense.group);

    addDoc(collection(groupRef, "expenses"), {
      desc: expense.desc,
      amount: expense.amount,
      payer: expense.payer,
      splitWith: expense.splitWith,
      perPerson: expense.perPerson,
      category: expense.category,
      notes: expense.notes,
      date: Timestamp.fromDate(new Date(expense.date)),
      createdAt: serverTimestamp(),
    })
      .then(() => {
        showSuccessToast();
      })
      .catch(err => {
        console.error("Error saving expense:", err);
        showFormError("Failed to save expense. Please try again.");
      });
  }
}

// ── Success Toast ─────────────────────────────────────────────

function showSuccessToast() {
  const btn = document.getElementById('submit-btn');
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
