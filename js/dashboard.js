/* ============================================================
   dashboard.js  —  SplitEase  |  dev-logic
   Handles: group data model, group card rendering,
            stat card updates, search filtering,
            balance summary wiring
   ============================================================ */

// ── In-memory Store (replaced by Firestore in dev-firebase) ───

/**
 * Groups store — each entry follows the Group typedef in balance.js
 * TODO (Dev 3): Replace with Firestore onSnapshot listener
 */
let GROUPS = [
  {
    id:        'goa',
    name:      'Goa Trip 2026',
    members:   ['Arif', 'Nadeem', 'Izhaan'],
    createdBy: 'arif',
    createdAt: '2026-06-10T10:00:00.000Z',
    status:    'settled',
    expenses: [
      { desc: "Dinner at Ocean's", amount: 3000, payer: 'Arif',   splitWith: ['Arif','Nadeem','Izhaan'], perPerson: 1000, date: '2026-06-16', category: 'food' },
      { desc: 'Uber Ride',        amount: 1500, payer: 'Izhaan', splitWith: ['Arif','Nadeem','Izhaan'], perPerson:  500, date: '2026-06-15', category: 'transport' },
    ],
  },
  {
    id:        'room',
    name:      'Room Expenses',
    members:   ['Arif', 'Nadeem'],
    createdBy: 'arif',
    createdAt: '2026-06-01T08:00:00.000Z',
    status:    'pending',
    expenses: [
      { desc: 'Room Rent', amount: 4500, payer: 'Nadeem', splitWith: ['Arif','Nadeem'], perPerson: 2250, date: '2026-06-14', category: 'accommodation' },
    ],
  },
  {
    id:        'office',
    name:      'Office Lunch',
    members:   ['Arif', 'Izhaan', 'Nadeem'],
    createdBy: 'arif',
    createdAt: '2026-06-12T12:00:00.000Z',
    status:    'pending',
    expenses: [
      { desc: 'Office Pizza', amount: 950, payer: 'Arif', splitWith: ['Arif','Izhaan','Nadeem'], perPerson: 316.67, date: '2026-06-13', category: 'food' },
    ],
  },
];

/** Currently logged-in user's name (replace with auth.currentUser.displayName after Dev 3 wires Auth) */
const CURRENT_USER = 'Arif';

// ── Greeting ──────────────────────────────────────────────────

function setGreeting() {
  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const el    = document.getElementById('greeting-text');
  if (el) el.textContent = greet + ' 👋';
}

// ── Stat Cards ────────────────────────────────────────────────

/** Recalculate and update the 4 stat cards on the dashboard */
function updateStatCards() {
  const allExpenses = GROUPS.flatMap(g => g.expenses);

  // Total expenses across all groups
  const total = totalExpenses(allExpenses);

  // What current user paid
  const paid = totalPaidBy(allExpenses, CURRENT_USER);

  // What current user owes (computed via balance calculator)
  const allTransactions = getAllTransactions();
  const owesTotal = totalOwedBy(allTransactions, CURRENT_USER);

  // Update DOM
  const totalEl  = document.querySelector('.stat-card:nth-child(1) .stat-value');
  const paidEl   = document.querySelector('.stat-card:nth-child(2) .stat-value');
  const owesEl   = document.querySelector('.stat-card:nth-child(3) .stat-value');
  const groupsEl = document.getElementById('groups-count');

  if (totalEl)  totalEl.textContent  = '₹' + total.toLocaleString('en-IN');
  if (paidEl)   paidEl.textContent   = '₹' + paid.toLocaleString('en-IN');
  if (owesEl)   owesEl.textContent   = '₹' + owesTotal.toLocaleString('en-IN');
  if (groupsEl) groupsEl.textContent = GROUPS.length;
}

// ── Balance Helpers ───────────────────────────────────────────

/** Get simplified transactions across ALL groups */
function getAllTransactions() {
  let allTransactions = [];
  GROUPS.forEach(group => {
    const balances     = computeNetBalances(group.expenses, group.members);
    const transactions = simplifyDebts(balances);
    allTransactions    = allTransactions.concat(transactions);
  });
  return allTransactions;
}

// ── Group Card Factory ────────────────────────────────────────

/**
 * Build and return a group card DOM element.
 * @param {Group} group
 * @returns {HTMLElement}
 */
function buildGroupCard(group) {
  const allExpenses = group.expenses || [];
  const spent = totalExpenses(allExpenses);

  const lastExpense = allExpenses.length > 0
    ? allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  const lastActive = lastExpense
    ? formatRelativeDate(lastExpense.date)
    : 'No expenses yet';

  const statusBadge = group.status === 'settled'
    ? '<span class="badge badge-success">Settled</span>'
    : '<span class="badge badge-pending">Pending</span>';

  const card = document.createElement('div');
  card.className   = 'card card-hover group-card fade-up';
  card.dataset.id  = group.id;
  card.dataset.name = group.name.toLowerCase();

  card.innerHTML = `
    <div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
        <h3 class="group-card-name">${escapeHTML(group.name)}</h3>
        ${statusBadge}
      </div>
      <div class="group-meta">
        <div class="group-meta-row">
          <span class="label">Members</span>
          <span class="value">${group.members.length} (${group.members.map(escapeHTML).join(', ')})</span>
        </div>
        <div class="group-meta-row">
          <span class="label">Total Spent</span>
          <span class="value green">₹${spent.toLocaleString('en-IN')}</span>
        </div>
        <div class="group-meta-row">
          <span class="label">Last Active</span>
          <span class="value">${lastActive}</span>
        </div>
      </div>
    </div>
    <div class="group-actions">
      <button class="btn btn-secondary btn-sm btn-full" onclick="viewGroup('${group.id}')">View Group</button>
      <button class="btn btn-primary btn-sm btn-icon" title="Add Expense"
        onclick="goToAddExpense('${escapeHTML(group.name)}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>`;

  return card;
}

// ── Render All Group Cards ────────────────────────────────────

function renderGroups(groups) {
  const grid = document.getElementById('groups-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (groups.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted-gray);">
        <p>No groups yet. Create one to get started!</p>
      </div>`;
    return;
  }

  groups.forEach(g => grid.appendChild(buildGroupCard(g)));
}

// ── Create Group ──────────────────────────────────────────────

/**
 * Validates form inputs, creates a new Group object,
 * adds it to the GROUPS store, and re-renders the grid.
 * TODO (Dev 3): Save to Firestore instead of local array
 * @param {Event} e
 */
function handleCreateGroup(e) {
  e.preventDefault();

  const nameInput    = document.getElementById('new-group-name');
  const membersInput = document.getElementById('new-group-members');

  const name    = nameInput.value.trim();
  const rawList = membersInput.value;

  // ── Validation ──
  if (!name) {
    nameInput.focus();
    return showGroupError('Please enter a group name.');
  }
  if (name.length < 2) {
    nameInput.focus();
    return showGroupError('Group name must be at least 2 characters.');
  }

  const members = rawList.split(',')
    .map(m => m.trim())
    .filter(m => m.length > 0);

  if (members.length === 0) {
    membersInput.focus();
    return showGroupError('Please add at least one member.');
  }

  // Duplicate name check
  const exists = GROUPS.find(g => g.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    nameInput.focus();
    return showGroupError(`A group named "${name}" already exists.`);
  }

  // ── Build Group object ──
  const newGroup = {
    id:        'group_' + Date.now(),
    name,
    members,
    createdBy: CURRENT_USER,
    createdAt: new Date().toISOString(),
    status:    'pending',
    expenses:  [],
  };

  // Add to store (TODO Dev 3: addDoc to Firestore)
  GROUPS.unshift(newGroup);

  // Re-render
  renderGroups(GROUPS);
  updateStatCards();
  closeModal();

  // Reset form
  nameInput.value    = '';
  membersInput.value = '';
}

function showGroupError(msg) {
  const err = document.getElementById('group-modal-error');
  if (err) { err.textContent = msg; err.style.display = 'block'; }
  else alert(msg);
}

// ── View Group ────────────────────────────────────────────────

function viewGroup(groupId) {
  // TODO: navigate to a group detail page or open a modal
  const group = GROUPS.find(g => g.id === groupId);
  if (!group) return;
  // For now, pass group ID via sessionStorage and navigate
  sessionStorage.setItem('viewGroupId', groupId);
  console.log('View group:', group.name);
  // window.location.href = 'group.html'; // when group page is built
}

// ── Navigate to Add Expense ───────────────────────────────────

function goToAddExpense(groupName) {
  sessionStorage.setItem('selectedGroup', groupName);
  window.location.href = 'add-expense.html';
}

// ── Recent Expense Renderer ───────────────────────────────────

const CATEGORY_EMOJI = {
  food:          '🍔',
  transport:     '🚗',
  accommodation: '🏢',
  shopping:      '🛍️',
  entertainment: '🎬',
  utilities:     '💡',
  other:         '📦',
};

function renderRecentExpenses() {
  const listEl = document.getElementById('expense-list');
  if (!listEl) return;

  // Collect all expenses with their group name, sort newest first
  const all = GROUPS.flatMap(g =>
    (g.expenses || []).map(e => ({ ...e, groupName: g.name }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  if (all.length === 0) {
    listEl.innerHTML = `<p style="color:var(--muted-gray);text-align:center;padding:20px;">No expenses yet.</p>`;
    return;
  }

  listEl.innerHTML = all.map(exp => `
    <div class="expense-row">
      <div class="expense-left">
        <div class="expense-emoji">${CATEGORY_EMOJI[exp.category] || '📦'}</div>
        <div>
          <div class="expense-name">${escapeHTML(exp.desc)}</div>
          <div class="expense-sub">Paid by <strong>${escapeHTML(exp.payer)}</strong> · ${escapeHTML(exp.groupName)}</div>
        </div>
      </div>
      <div class="expense-right">
        <div class="expense-amount">₹${exp.amount.toLocaleString('en-IN')}</div>
        <div class="expense-date">${formatRelativeDate(exp.date)}</div>
      </div>
    </div>
  `).join('');
}

// ── Search / Filter ───────────────────────────────────────────

/**
 * Filters groups and expense rows by a search query.
 * Matches against group name, members, and expense descriptions.
 * @param {string} val
 */
function handleSearch(val) {
  const query = val.toLowerCase().trim();

  if (!query) {
    renderGroups(GROUPS);
    renderRecentExpenses();
    return;
  }

  // Filter groups
  const filteredGroups = GROUPS.filter(g => {
    const nameMatch    = g.name.toLowerCase().includes(query);
    const memberMatch  = g.members.some(m => m.toLowerCase().includes(query));
    const expenseMatch = g.expenses.some(e => e.desc.toLowerCase().includes(query));
    return nameMatch || memberMatch || expenseMatch;
  });

  renderGroups(filteredGroups);

  // Filter recent expenses
  const listEl = document.getElementById('expense-list');
  if (listEl) {
    const rows = listEl.querySelectorAll('.expense-row');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  }
}

// ── Modal ─────────────────────────────────────────────────────

function openModal(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('create-group-modal');
  if (modal) modal.classList.add('open');
}

function closeModal() {
  const modal = document.getElementById('create-group-modal');
  if (modal) modal.classList.remove('open');
  const err = document.getElementById('group-modal-error');
  if (err) { err.textContent = ''; err.style.display = 'none'; }
}

// ── Sidebar (mobile) ──────────────────────────────────────────

function openSidebar()  {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ── Utility ───────────────────────────────────────────────────

/** Prevent XSS when inserting user content into innerHTML */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format a date string as a relative label.
 * @param {string} dateStr  e.g. '2026-06-16'
 * @returns {string}  e.g. 'Today, 2:30 PM' | 'Yesterday' | '14 Jun'
 */
function formatRelativeDate(dateStr) {
  const date  = new Date(dateStr);
  const today = new Date();
  const diff  = Math.floor((today - date) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)   return `${diff} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  renderGroups(GROUPS);
  renderRecentExpenses();
  updateStatCards();

  // Render balance summary using real calculator
  const allTransactions = getAllTransactions();
  renderBalanceSummary(allTransactions, CURRENT_USER);
});
