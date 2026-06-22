import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
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
  totalOwedTo,
  renderBalanceSummary,
  formatCurrency
} from "./balance.js?v=3";

/* ============================================================
   dashboard.js  —  SplitEase  |  dev-firebase
   Handles: group data model, group card rendering,
            stat card updates, search filtering,
            balance summary wiring, real-time Firestore sync
   ============================================================ */

let GROUPS = [];
let CURRENT_USER = '';
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
  const allExpenses    = GROUPS.flatMap(g => g.expenses || []);
  const allTransactions = getAllTransactions();

  const total    = totalExpenses(allExpenses);
  const paid     = totalPaidBy(allExpenses, CURRENT_USER);
  const owes     = totalOwedBy(allTransactions, CURRENT_USER);
  const isOwed   = totalOwedTo(allTransactions, CURRENT_USER);

  const totalEl  = document.querySelector('.stat-card:nth-child(1) .stat-value');
  const paidEl   = document.querySelector('.stat-card:nth-child(2) .stat-value');
  const owesEl   = document.querySelector('.stat-card:nth-child(3) .stat-value');
  const groupsEl = document.getElementById('groups-count');

  if (totalEl)  totalEl.textContent  = formatCurrency(total);
  if (paidEl)   paidEl.textContent   = formatCurrency(paid);
  if (owesEl)   owesEl.textContent   = formatCurrency(owes);
  if (groupsEl) groupsEl.textContent = GROUPS.length;
}

// ── Balance Helpers ───────────────────────────────────────────

/** Get simplified transactions across ALL groups */
function getAllTransactions() {
  let allTransactions = [];
  GROUPS.forEach(group => {
    const balances     = computeNetBalances(group.expenses || [], group.members || []);
    const transactions = simplifyDebts(balances);
    transactions.forEach(t => t.groupId = group.id);
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
        <div style="display:flex; align-items:center; gap:8px;">
          ${statusBadge}
          <button class="btn btn-sm btn-icon" style="background:transparent; border:none; color:var(--muted-gray); padding:4px;" title="Edit Group" onclick="window.editGroup('${group.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <button class="btn btn-sm btn-icon" style="background:transparent; border:none; color:var(--red); padding:4px;" title="Delete Group" onclick="window.deleteGroup('${group.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      <div class="group-meta">
        <div class="group-meta-row">
          <span class="label">Members</span>
          <span class="value">${group.members.length} (${group.members.map(escapeHTML).join(', ')})</span>
        </div>
        <div class="group-meta-row">
          <span class="label">Total Spent</span>
          <span class="value green">${formatCurrency(spent)}</span>
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
  const editIdInput  = document.getElementById('edit-group-id');

  const name    = nameInput.value.trim();
  const rawList = membersInput.value;
  const editId  = editIdInput ? editIdInput.value : '';

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

  // Duplicate name check (skip if editing the same group)
  const exists = GROUPS.find(g => g.name.toLowerCase() === name.toLowerCase() && g.id !== editId);
  if (exists) {
    nameInput.focus();
    return showGroupError(`A group named "${name}" already exists.`);
  }

  if (editId) {
    // Update existing group
    const groupRef = doc(db, "groups", editId);
    updateDoc(groupRef, { name, members })
      .then(() => {
        closeModal();
        nameInput.value    = '';
        membersInput.value = '';
        if (editIdInput) editIdInput.value = '';
      })
      .catch(err => {
        console.error("Error updating group:", err);
        showGroupError("Failed to update group. Please try again.");
      });
  } else {
    // Create new group
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

// ── Edit / Delete Group ───────────────────────────────────────

function editGroup(groupId) {
  const group = GROUPS.find(g => g.id === groupId);
  if (!group) return;

  const modalTitle = document.getElementById('group-modal-title');
  const modalSubmit = document.getElementById('group-modal-submit');
  if (modalTitle) modalTitle.textContent = 'Edit Group';
  if (modalSubmit) modalSubmit.textContent = 'Save Changes';

  document.getElementById('edit-group-id').value = group.id;
  document.getElementById('new-group-name').value = group.name;
  document.getElementById('new-group-members').value = group.members.join(', ');

  openModal();
}

function deleteGroup(groupId) {
  const group = GROUPS.find(g => g.id === groupId);
  if (!group) return;

  if (confirm(`Are you sure you want to delete the group "${group.name}"? This action cannot be undone.`)) {
    deleteDoc(doc(db, "groups", groupId))
      .then(() => console.log('Group deleted'))
      .catch(err => console.error('Error deleting group:', err));
  }
}

// ── View Group ────────────────────────────────────────────────

function viewGroup(groupId) {
  const group = GROUPS.find(g => g.id === groupId);
  if (!group) return;
  sessionStorage.setItem('viewGroupId', groupId);
  window.location.href = 'group.html';
}

// ── Settle Up ─────────────────────────────────────────────────

function handleSettle(groupId, from, to, amount) {
  if (!confirm(`Record a settlement of ₹${amount} from ${from} to ${to}?`)) return;
  
  const newExp = {
    desc: 'Settled up',
    amount: amount,
    payer: from,
    splitWith: [to],
    category: 'settlement',
    isSettlement: true,
    date: new Date().toISOString()
  };
  
  addDoc(collection(db, "groups", groupId, "expenses"), newExp)
    .then(() => alert(`Successfully recorded settlement from ${from} to ${to}!`))
    .catch(err => {
      console.error("Error settling:", err);
      alert("Failed to settle. Please try again.");
    });
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
        <div class="expense-amount">${formatCurrency(exp.amount)}</div>
        <div class="expense-date">${formatRelativeDate(exp.date)}</div>
      </div>
    </div>
  `).join('');
}

// ── Search / Filter (debounced) ───────────────────────────────

let _searchTimer = null;

/**
 * Debounced search: waits 200 ms after the user stops typing before filtering.
 * Prevents UI jitter on every keystroke.
 *
 * @param {string} val - Current value of the search input
 */
function handleSearch(val) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => _applySearch(val.trim().toLowerCase()), 200);
}

function _applySearch(queryVal) {
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
  
  // Reset fields to create mode
  document.getElementById('new-group-name').value = '';
  document.getElementById('new-group-members').value = '';
  document.getElementById('edit-group-id').value = '';
  
  const modalTitle = document.getElementById('group-modal-title');
  const modalSubmit = document.getElementById('group-modal-submit');
  if (modalTitle) modalTitle.textContent = 'Create New Group';
  if (modalSubmit) modalSubmit.textContent = 'Create Group';
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

// ── Firebase Real-time Synchronization ────────────────────────

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
              isSettlement: expData.isSettlement || expData.category === 'settlement' || expData.desc === 'Settled up',
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

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setGreeting();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      initFirebaseSync(user);
    } else {
      window.location.href = 'index.html';
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
window.editGroup = editGroup;
window.deleteGroup = deleteGroup;
window.handleSettle = handleSettle;
