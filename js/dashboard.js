import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  computeNetBalances,
  simplifyDebts,
  getUserSummary,
  totalExpenses,
  totalPaidBy,
  totalOwedBy,
  renderBalanceSummary
} from "./balance.js";

/* ============================================================
   dashboard.js  —  SplitEase  |  dev-firebase
   Handles: group data model, group card rendering,
            stat card updates, search filtering,
            balance summary wiring, real-time Firestore sync
   ============================================================ */

// ── In-memory Fallback Store for Guest Mode ───────────────────
let GUEST_GROUPS = [
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

let GROUPS = [];
let CURRENT_USER = 'Guest';
let expenseListeners = {};
let groupsListener = null;

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
  const allExpenses = GROUPS.flatMap(g => g.expenses || []);

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
    const balances     = computeNetBalances(group.expenses || [], group.members || []);
    const transactions = simplifyDebts(balances);
    allTransactions    = allTransactions.concat(transactions);
  });
  return allTransactions;
}

// ── Group Card Factory ────────────────────────────────────────

/**
 * Build and return a group card DOM element.
 * @param {Object} group
 * @returns {HTMLElement}
 */
function buildGroupCard(group) {
  const allExpenses = group.expenses || [];
  const spent = totalExpenses(allExpenses);

  const lastExpense = allExpenses.length > 0
    ? [...allExpenses].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
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
      <button class="btn btn-secondary btn-sm btn-full" onclick="window.viewGroup('${group.id}')">View Group</button>
      <button class="btn btn-primary btn-sm btn-icon" title="Add Expense"
        onclick="window.goToAddExpense('${escapeHTML(group.name)}')">
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
 * Validates form inputs, creates a new Group object in Firestore (or local if Guest).
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

  // Ensure current user is included in the members list
  if (!members.some(m => m.toLowerCase() === CURRENT_USER.toLowerCase())) {
    members.unshift(CURRENT_USER);
  }

  // Duplicate name check
  const exists = GROUPS.find(g => g.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    nameInput.focus();
    return showGroupError(`A group named "${name}" already exists.`);
  }

  const isGuest = sessionStorage.getItem('isGuest') === 'true';

  if (isGuest) {
    const newGroup = {
      id:        'group_' + Date.now(),
      name,
      members,
      createdBy: CURRENT_USER,
      createdAt: new Date().toISOString(),
      status:    'pending',
      expenses:  [],
    };
    GROUPS.unshift(newGroup);
    renderDashboard();
    closeModal();
    nameInput.value    = '';
    membersInput.value = '';
  } else {
    const newGroupData = {
      name,
      members,
      createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      status: 'pending'
    };

    addDoc(collection(db, "groups"), newGroupData)
      .then(() => {
        closeModal();
        nameInput.value    = '';
        membersInput.value = '';
      })
      .catch(err => {
        console.error("Error creating group:", err);
        showGroupError("Failed to create group. Please try again.");
      });
  }
}

function showGroupError(msg) {
  const err = document.getElementById('group-modal-error');
  if (err) { err.textContent = msg; err.style.display = 'block'; }
  else alert(msg);
}

// ── View Group ────────────────────────────────────────────────

function viewGroup(groupId) {
  const group = GROUPS.find(g => g.id === groupId);
  if (!group) return;
  sessionStorage.setItem('viewGroupId', groupId);
  console.log('View group:', group.name);
  alert(`Group details for "${group.name}" coming soon!`);
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

function handleSearch(val) {
  const queryVal = val.toLowerCase().trim();

  if (!queryVal) {
    renderGroups(GROUPS);
    renderRecentExpenses();
    return;
  }

  // Filter groups
  const filteredGroups = GROUPS.filter(g => {
    const nameMatch    = g.name.toLowerCase().includes(queryVal);
    const memberMatch  = g.members.some(m => m.toLowerCase().includes(queryVal));
    const expenseMatch = g.expenses.some(e => e.desc.toLowerCase().includes(queryVal));
    return nameMatch || memberMatch || expenseMatch;
  });

  renderGroups(filteredGroups);

  // Filter recent expenses
  const listEl = document.getElementById('expense-list');
  if (listEl) {
    const rows = listEl.querySelectorAll('.expense-row');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(queryVal) ? '' : 'none';
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

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRelativeDate(dateStr) {
  const date  = new Date(dateStr);
  const today = new Date();
  
  // Set times to midnight to calculate accurate day differences
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff  = Math.floor((d2 - d1) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)   return `${diff} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Firebase Real-time Synchronization ─────────────────────────

function initFirebaseSync(user) {
  CURRENT_USER = user.displayName || user.email.split('@')[0];
  
  // Update User Chip
  const userAvatar = document.querySelector('.user-avatar');
  const userChipName = document.querySelector('.user-chip-name');
  if (userAvatar) {
    userAvatar.textContent = CURRENT_USER.charAt(0).toUpperCase();
  }
  if (userChipName) {
    userChipName.textContent = CURRENT_USER;
  }

  // Real-time query for groups containing current user
  const groupsQuery = query(
    collection(db, "groups"),
    where("members", "array-contains", CURRENT_USER)
  );

  groupsListener = onSnapshot(groupsQuery, (snapshot) => {
    const activeGroupIds = [];
    const newGroupsMap = {};

    snapshot.forEach(docSnap => {
      const gData = docSnap.data();
      const groupId = docSnap.id;
      activeGroupIds.push(groupId);

      newGroupsMap[groupId] = {
        id: groupId,
        name: gData.name,
        members: gData.members || [],
        createdBy: gData.createdBy,
        createdAt: gData.createdAt ? (gData.createdAt.toDate ? gData.createdAt.toDate().toISOString() : gData.createdAt) : new Date().toISOString(),
        status: gData.status || 'pending',
        expenses: [] // populated by subcollection listener
      };
    });

    // Unsubscribe from removed groups
    Object.keys(expenseListeners).forEach(gid => {
      if (!activeGroupIds.includes(gid)) {
        expenseListeners[gid]();
        delete expenseListeners[gid];
      }
    });

    if (activeGroupIds.length === 0) {
      GROUPS = [];
      renderDashboard();
      return;
    }

    // Set up or maintain subcollection listeners for active groups
    activeGroupIds.forEach(gid => {
      if (!expenseListeners[gid]) {
        const expensesQuery = query(
          collection(db, "groups", gid, "expenses"),
          orderBy("date", "desc")
        );

        expenseListeners[gid] = onSnapshot(expensesQuery, (expSnapshot) => {
          const expenses = [];
          expSnapshot.forEach(expSnap => {
            const expData = expSnap.data();
            expenses.push({
              id: expSnap.id,
              desc: expData.desc,
              amount: expData.amount,
              payer: expData.payer,
              splitWith: expData.splitWith || [],
              perPerson: expData.perPerson,
              date: expData.date ? (expData.date.toDate ? expData.date.toDate().toISOString().split('T')[0] : expData.date) : new Date().toISOString().split('T')[0],
              category: expData.category || 'other',
              notes: expData.notes || '',
              createdAt: expData.createdAt
            });
          });

          if (newGroupsMap[gid]) {
            newGroupsMap[gid].expenses = expenses;
          } else {
            const cachedGroup = GROUPS.find(g => g.id === gid);
            if (cachedGroup) cachedGroup.expenses = expenses;
          }

          GROUPS = Object.values(newGroupsMap);
          renderDashboard();
        }, (error) => {
          console.error(`Error loading expenses for group ${gid}:`, error);
        });
      } else {
        const oldGroup = GROUPS.find(g => g.id === gid);
        if (oldGroup) {
          newGroupsMap[gid].expenses = oldGroup.expenses || [];
        }
      }
    });

    GROUPS = Object.values(newGroupsMap);
    renderDashboard();
  }, (error) => {
    console.error("Error subscribing to groups:", error);
  });
}

function renderDashboard() {
  renderGroups(GROUPS);
  renderRecentExpenses();
  updateStatCards();
  
  const allTransactions = getAllTransactions();
  renderBalanceSummary(allTransactions, CURRENT_USER);
}

// ── Logout Handler ─────────────────────────────────────────────

function handleLogout(e) {
  e.preventDefault();
  if (sessionStorage.getItem('isGuest') === 'true') {
    sessionStorage.removeItem('isGuest');
    window.location.href = 'index.html';
  } else {
    // Unsubscribe from listeners
    if (groupsListener) {
      groupsListener();
    }
    Object.values(expenseListeners).forEach(unsubscribe => unsubscribe());
    expenseListeners = {};

    signOut(auth)
      .then(() => {
        window.location.href = 'index.html';
      })
      .catch(err => {
        console.error("Signout failed:", err);
        window.location.href = 'index.html';
      });
  }
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setGreeting();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      initFirebaseSync(user);
    } else {
      if (sessionStorage.getItem('isGuest') === 'true') {
        CURRENT_USER = 'Arif';
        GROUPS = GUEST_GROUPS;
        renderDashboard();
      } else {
        window.location.href = 'index.html';
      }
    }
  });
});

// Expose functions to window
window.openModal = openModal;
window.closeModal = closeModal;
window.handleCreateGroup = handleCreateGroup;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.handleSearch = handleSearch;
window.viewGroup = viewGroup;
window.goToAddExpense = goToAddExpense;
window.handleLogout = handleLogout;
