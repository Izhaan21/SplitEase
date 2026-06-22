import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import {
  computeNetBalances,
  simplifyDebts,
  renderBalanceSummary,
  formatCurrency
} from "./balance.js?v=3";

let CURRENT_USER = '';
let groupId = sessionStorage.getItem('viewGroupId');
let currentGroup = null;

const CATEGORY_EMOJI = {
  food:          '🍔',
  transport:     '🚗',
  accommodation: '🏢',
  shopping:      '🛍️',
  entertainment: '🎬',
  utilities:     '💡',
  other:         '📦',
};

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
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff  = Math.floor((d2 - d1) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)   return `${diff} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function openSidebar()  {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

function handleLogout(e) {
  e.preventDefault();
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  });
}

function goToAddExpense() {
  if (currentGroup) {
    sessionStorage.setItem('selectedGroup', currentGroup.name);
  }
  window.location.href = 'add-expense.html';
}

function renderExpenses() {
  const listEl = document.getElementById('expense-list');
  if (!listEl) return;

  const expenses = currentGroup.expenses || [];
  if (expenses.length === 0) {
    listEl.innerHTML = `<p style="color:var(--muted-gray);text-align:center;padding:20px;">No expenses yet.</p>`;
    return;
  }

  listEl.innerHTML = expenses.map(exp => `
    <div class="expense-row">
      <div class="expense-left">
        <div class="expense-emoji">${CATEGORY_EMOJI[exp.category] || '📦'}</div>
        <div>
          <div class="expense-name">${escapeHTML(exp.desc)}</div>
          <div class="expense-sub">Paid by <strong>${escapeHTML(exp.payer)}</strong></div>
        </div>
      </div>
      <div class="expense-right">
        <div class="expense-amount">${formatCurrency(exp.amount)}</div>
        <div class="expense-date">${formatRelativeDate(exp.date)}</div>
        <button class="btn btn-sm btn-icon" style="background:transparent; border:none; color:var(--red); padding:4px; margin-left:8px;" title="Delete Expense" onclick="window.deleteExpense('${exp.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function deleteExpense(expenseId) {
  if (confirm("Are you sure you want to delete this expense?")) {
    deleteDoc(doc(db, "groups", groupId, "expenses", expenseId))
      .then(() => console.log('Expense deleted'))
      .catch(err => console.error('Error deleting expense:', err));
  }
}

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

function initFirebaseSync(user) {
  CURRENT_USER = user.displayName || user.email.split('@')[0];
  
  if (!groupId) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Listen to the group document
  const groupRef = doc(db, "groups", groupId);
  onSnapshot(groupRef, (docSnap) => {
    if (!docSnap.exists()) {
      alert("Group not found!");
      window.location.href = 'dashboard.html';
      return;
    }
    
    const gData = docSnap.data();
    currentGroup = {
      id: docSnap.id,
      name: gData.name,
      members: gData.members || [],
      status: gData.status || 'pending',
      expenses: currentGroup ? currentGroup.expenses : []
    };
    
    document.getElementById('group-title').textContent = currentGroup.name;
    
    // Listen to expenses
    const expensesQuery = query(
      collection(db, "groups", groupId, "expenses"),
      orderBy("date", "desc")
    );
    
    onSnapshot(expensesQuery, (expSnapshot) => {
      const expenses = [];
      expSnapshot.forEach(expSnap => {
        const expData = expSnap.data();
        expenses.push({
          id: expSnap.id,
          desc: expData.desc,
          amount: expData.amount,
          payer: expData.payer,
          splitWith: expData.splitWith || [],
          date: expData.date ? (expData.date.toDate ? expData.date.toDate().toISOString().split('T')[0] : expData.date) : new Date().toISOString().split('T')[0],
          category: expData.category || 'other',
          isSettlement: expData.isSettlement || expData.category === 'settlement' || expData.desc === 'Settled up'
        });
      });
      
      currentGroup.expenses = expenses;
      renderExpenses();
      
      const balances = computeNetBalances(currentGroup.expenses || [], currentGroup.members || []);
      const transactions = simplifyDebts(balances);
      transactions.forEach(t => t.groupId = currentGroup.id);
      renderBalanceSummary(transactions, CURRENT_USER);
      
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      initFirebaseSync(user);
    } else {
      window.location.href = 'index.html';
    }
  });
});

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.handleLogout = handleLogout;
window.goToAddExpense = goToAddExpense;
window.handleSettle = handleSettle;
window.deleteExpense = deleteExpense;
