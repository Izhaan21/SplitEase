/* ============================================================
   balance.js  —  SplitEase  |  dev-logic
   DAY 3 — Nadeem (dev-logic)
   Handles: balance calculation, debt simplification,
            balance summary rendering on dashboard
   ============================================================ */

// ── Data Models ───────────────────────────────────────────────

/**
 * @typedef {Object} Member
 * @property {string} name        - Member display name
 * @property {number} totalPaid   - Total amount this member has paid
 * @property {number} totalOwes   - Total amount this member owes (their share)
 * @property {number} netBalance  - totalPaid - totalOwes (positive = owed money, negative = owes money)
 */

/**
 * @typedef {Object} Expense
 * @property {string}   desc       - Description
 * @property {number}   amount     - Total amount
 * @property {string}   payer      - Name of who paid
 * @property {string[]} splitWith  - Array of member names sharing the expense
 * @property {number}   perPerson  - Amount per person
 * @property {string}   date       - ISO date string
 * @property {string}   category   - Expense category
 */

/**
 * @typedef {Object} Group
 * @property {string}    id        - Unique group ID
 * @property {string}    name      - Group name
 * @property {string[]}  members   - Member names
 * @property {string}    createdBy - User ID of creator
 * @property {string}    createdAt - ISO timestamp
 * @property {Expense[]} expenses  - List of expenses in this group
 */

/**
 * @typedef {Object} Transaction
 * @property {string} from    - Who pays
 * @property {string} to      - Who receives
 * @property {number} amount  - How much
 */

// ── Core Balance Calculator ───────────────────────────────────

/**
 * Given a list of expenses and all group members, compute
 * each member's net balance (positive = is owed, negative = owes).
 *
 * @param {Expense[]} expenses
 * @param {string[]}  members
 * @returns {Object.<string, number>}  e.g. { "Arif": 500, "Nadeem": -300, "Izhaan": -200 }
 */
function computeNetBalances(expenses, members) {
  // Initialise everyone to 0
  const balances = {};
  members.forEach(m => { balances[m] = 0; });

  expenses.forEach(exp => {
    const { payer, amount, splitWith } = exp;
    if (!splitWith || splitWith.length === 0) return;

    const share = amount / splitWith.length;

    // Payer is credited the full amount they put in
    if (balances[payer] !== undefined) {
      balances[payer] += amount;
    }

    // Each person who split is debited their share
    splitWith.forEach(member => {
      if (balances[member] !== undefined) {
        balances[member] -= share;
      }
    });
  });

  // Round to 2 decimal places
  Object.keys(balances).forEach(m => {
    balances[m] = +balances[m].toFixed(2);
  });

  return balances;
}

/**
 * Simplify debts using a greedy algorithm.
 * Minimises the number of transactions needed to settle all balances.
 *
 * @param {Object.<string, number>} balances
 * @returns {Transaction[]}
 */
function simplifyDebts(balances) {
  // Separate into creditors (owed money) and debtors (owe money)
  const creditors = [];
  const debtors   = [];

  Object.entries(balances).forEach(([name, amount]) => {
    if (amount > 0.01)       creditors.push({ name, amount });
    else if (amount < -0.01) debtors.push({ name, amount: -amount }); // store as positive
  });

  // Sort descending by amount for greedy matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt   = debtors[j];
    const settle = Math.min(credit.amount, debt.amount);

    transactions.push({
      from:   debt.name,
      to:     credit.name,
      amount: +settle.toFixed(2),
    });

    credit.amount -= settle;
    debt.amount   -= settle;

    if (credit.amount < 0.01) i++;
    if (debt.amount   < 0.01) j++;
  }

  return transactions;
}

// ── Summary for a single user ─────────────────────────────────

/**
 * Given simplified transactions, filter those relevant to a specific user.
 * Returns what the user owes others and what others owe the user.
 *
 * @param {Transaction[]} transactions
 * @param {string}        currentUser
 * @returns {{ owes: Transaction[], owed: Transaction[] }}
 */
function getUserSummary(transactions, currentUser) {
  const owes = transactions.filter(t => t.from === currentUser);
  const owed = transactions.filter(t => t.to   === currentUser);
  return { owes, owed };
}

// ── Total calculators ─────────────────────────────────────────

/**
 * @param {Expense[]} expenses
 * @returns {number} Sum of all expense amounts
 */
function totalExpenses(expenses) {
  return +expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2);
}

/**
 * @param {Expense[]} expenses
 * @param {string}    member
 * @returns {number} Total amount paid by this member
 */
function totalPaidBy(expenses, member) {
  return +expenses
    .filter(e => e.payer === member)
    .reduce((sum, e) => sum + e.amount, 0)
    .toFixed(2);
}

/**
 * @param {Transaction[]} transactions
 * @param {string}        member
 * @returns {number} Total this member owes across all transactions
 */
function totalOwedBy(transactions, member) {
  return +transactions
    .filter(t => t.from === member)
    .reduce((sum, t) => sum + t.amount, 0)
    .toFixed(2);
}

// ── Dashboard Balance Renderer ────────────────────────────────

/**
 * Renders the balance summary section on the dashboard.
 * Replaces the static HTML with real computed data.
 *
 * @param {Transaction[]} transactions
 * @param {string}        currentUser
 */
function renderBalanceSummary(transactions, currentUser) {
  const listEl = document.getElementById('balance-list');
  const tipEl  = document.getElementById('settle-tip-body');
  if (!listEl) return;

  const { owes, owed } = getUserSummary(transactions, currentUser);
  listEl.innerHTML = '';

  if (owes.length === 0 && owed.length === 0) {
    listEl.innerHTML = `
      <div style="text-align:center;padding:24px 0;color:var(--primary-green);">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px;">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p style="font-weight:600;">You're all settled up! 🎉</p>
      </div>`;
    if (tipEl) tipEl.closest('.settle-tip').style.display = 'none';
    return;
  }

  const AVATAR_COLORS = ['#F59E0B', '#22C55E', '#EF4444', '#6366F1', '#EC4899'];
  let colorIdx = 0;

  // Render debts (what you owe)
  owes.forEach(t => {
    const color = AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length];
    listEl.innerHTML += `
      <div class="balance-row">
        <div class="balance-who">
          <div class="avatar-sm" style="background:${color}">${t.to.charAt(0)}</div>
          <div class="balance-info">
            <p>You owe <strong>${t.to}</strong></p>
          </div>
        </div>
        <span class="balance-amount text-red">₹${t.amount.toLocaleString('en-IN')}</span>
      </div>`;
  });

  // Render credits (what others owe you)
  owed.forEach(t => {
    const color = AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length];
    listEl.innerHTML += `
      <div class="balance-row">
        <div class="balance-who">
          <div class="avatar-sm" style="background:${color}">${t.from.charAt(0)}</div>
          <div class="balance-info">
            <p><strong>${t.from}</strong> owes you</p>
          </div>
        </div>
        <span class="balance-amount text-green">₹${t.amount.toLocaleString('en-IN')}</span>
      </div>`;
  });

  // Smart suggestion tip
  if (tipEl && transactions.length > 0) {
    const tips = transactions
      .map(t => `<strong>${t.from}</strong> pays <strong>${t.to}</strong> ₹${t.amount.toLocaleString('en-IN')}`)
      .join(' · ');
    tipEl.innerHTML = `Simplest way to settle: ${tips}.`;
    tipEl.closest('.settle-tip').style.display = '';
  }
}

// ── Group Balance Summary (convenience wrapper) ──────────────

/**
 * One-shot helper: given a full group object, return
 * net balances, simplified transactions, and per-user summary.
 *
 * @param {Object} group  - { members: string[], expenses: Expense[] }
 * @param {string} currentUser
 * @returns {{ balances: Object, transactions: Transaction[], summary: { owes: Transaction[], owed: Transaction[] } }}
 */
function getGroupBalanceSummary(group, currentUser) {
  const balances     = computeNetBalances(group.expenses || [], group.members || []);
  const transactions = simplifyDebts(balances);
  const summary      = getUserSummary(transactions, currentUser);
  return { balances, transactions, summary };
}

// ── Exports (used by dashboard.js and expense.js) ─────────────
export {
  computeNetBalances,
  simplifyDebts,
  getUserSummary,
  totalExpenses,
  totalPaidBy,
  totalOwedBy,
  renderBalanceSummary,
  getGroupBalanceSummary
};
