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

// ── Utility: Currency Formatter ───────────────────────────────

/**
 * Formats a number as Indian Rupee string.
 * e.g. 1500 → "₹1,500"   |   1500.5 → "₹1,500.50"
 *
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  let currency = 'INR';
  try {
    const s = JSON.parse(localStorage.getItem('splitease_settings') || '{}');
    if (s['s-currency']) currency = s['s-currency'];
  } catch (e) {}

  if (currency === 'USDT') {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (currency === 'EUR') {
    return '€' + amount.toLocaleString('de-DE');
  }
  return '₹' + amount.toLocaleString('en-IN');
}

/**
 * Safe rounding to avoid floating-point drift (e.g. 0.1 + 0.2 = 0.30000000000000004).
 * @param {number} n
 * @returns {number}
 */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ── Core Balance Calculator ───────────────────────────────────

/**
 * Given a list of expenses and all group members, compute
 * each member's net balance (positive = is owed, negative = owes).
 *
 * Handles edge cases:
 *  - Payer not in splitWith (they paid for others but aren't sharing)
 *  - Unknown payer/members (skipped gracefully)
 *  - Empty expense list (returns all zeros)
 *
 * @param {Expense[]} expenses
 * @param {string[]}  members
 * @returns {Object.<string, number>}  e.g. { "Arif": 500, "Nadeem": -300, "Izhaan": -200 }
 */
function computeNetBalances(expenses, members) {
  // Initialise everyone to 0
  const balances = {};
  // Build a lowercase → canonical-name map for case-insensitive lookups
  const memberMap = {};
  members.forEach(m => {
    balances[m] = 0;
    memberMap[m.toLowerCase()] = m;
  });

  expenses.forEach(exp => {
    const { payer, amount, splitWith } = exp;

    // Skip invalid expenses
    if (!payer || !amount || amount <= 0) return;
    if (!splitWith || splitWith.length === 0) return;

    const share = round2(amount / splitWith.length);

    // Credit the payer — match case-insensitively
    const canonicalPayer = memberMap[payer.toLowerCase()];
    if (canonicalPayer !== undefined) {
      balances[canonicalPayer] = round2(balances[canonicalPayer] + amount);
    }

    // Debit each person in the split — match case-insensitively
    splitWith.forEach(member => {
      const canonicalMember = memberMap[member.toLowerCase()];
      if (canonicalMember !== undefined) {
        balances[canonicalMember] = round2(balances[canonicalMember] - share);
      }
    });
  });

  return balances;
}

/**
 * Checks if a group is fully settled (all balances are effectively zero).
 *
 * @param {Object.<string, number>} balances
 * @returns {boolean}
 */
function isGroupSettled(balances) {
  return Object.values(balances).every(v => Math.abs(v) < 0.01);
}

/**
 * Simplify debts using a greedy two-pointer algorithm.
 * Minimises the number of transactions needed to settle all balances.
 *
 * @param {Object.<string, number>} balances
 * @returns {Transaction[]}
 */
function simplifyDebts(balances) {
  // Nothing to do if everyone is settled
  if (isGroupSettled(balances)) return [];

  // Separate into creditors (owed money) and debtors (owe money)
  const creditors = [];
  const debtors   = [];

  Object.entries(balances).forEach(([name, amount]) => {
    if (amount > 0.01)       creditors.push({ name, amount });
    else if (amount < -0.01) debtors.push({ name, amount: -amount }); // store as positive
  });

  // Sort largest first for greedy matching (fewer transactions)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt   = debtors[j];
    const settle = round2(Math.min(credit.amount, debt.amount));

    if (settle > 0.01) {
      transactions.push({
        from:   debt.name,
        to:     credit.name,
        amount: settle,
      });
    }

    credit.amount = round2(credit.amount - settle);
    debt.amount   = round2(debt.amount   - settle);

    if (credit.amount < 0.01) i++;
    if (debt.amount   < 0.01) j++;
  }

  return transactions;
}

// ── User-specific Summaries ───────────────────────────────────

/**
 * Given simplified transactions, filter those relevant to a specific user.
 *
 * @param {Transaction[]} transactions
 * @param {string}        currentUser
 * @returns {{ owes: Transaction[], owed: Transaction[] }}
 */
function getUserSummary(transactions, currentUser) {
  const cu = currentUser.toLowerCase();
  const owes = transactions.filter(t => t.from && t.from.toLowerCase() === cu);
  const owed = transactions.filter(t => t.to   && t.to.toLowerCase()   === cu);
  return { owes, owed };
}

/**
 * Total amount a user owes (across all provided transactions).
 *
 * @param {Transaction[]} transactions
 * @param {string}        member
 * @returns {number}
 */
function totalOwedBy(transactions, member) {
  const m = member.toLowerCase();
  return round2(
    transactions
      .filter(t => t.from && t.from.toLowerCase() === m)
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

/**
 * Total amount others owe this user.
 *
 * @param {Transaction[]} transactions
 * @param {string}        member
 * @returns {number}
 */
function totalOwedTo(transactions, member) {
  const m = member.toLowerCase();
  return round2(
    transactions
      .filter(t => t.to && t.to.toLowerCase() === m)
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

// ── Expense Aggregators ────────────────────────────────────────

/**
 * @param {Expense[]} expenses
 * @returns {number} Sum of all expense amounts
 */
function totalExpenses(expenses) {
  return round2(expenses.filter(e => !e.isSettlement).reduce((sum, e) => sum + (e.amount || 0), 0));
}

/**
 * @param {Expense[]} expenses
 * @param {string}    member
 * @returns {number} Total amount paid by this member
 */
function totalPaidBy(expenses, member) {
  const m = member.toLowerCase();
  return round2(
    expenses
      .filter(e => e.payer && e.payer.toLowerCase() === m && !e.isSettlement)
      .reduce((sum, e) => sum + e.amount, 0)
  );
}

/**
 * Returns a per-category spending breakdown for an expense list.
 *
 * @param {Expense[]} expenses
 * @returns {Object.<string, number>}  e.g. { food: 1500, transport: 800 }
 */
function categoryBreakdown(expenses) {
  const breakdown = {};
  expenses.forEach(e => {
    const cat = e.category || 'other';
    breakdown[cat] = round2((breakdown[cat] || 0) + e.amount);
  });
  return breakdown;
}

// ── Group Balance Summary (convenience wrapper) ──────────────

/**
 * One-shot helper: given a full group object, returns a complete
 * balance picture — net balances, simplified transactions,
 * per-user summary, settled status and totals.
 *
 * @param {Object} group        - { members: string[], expenses: Expense[] }
 * @param {string} currentUser
 * @returns {{
 *   balances:     Object.<string, number>,
 *   transactions: Transaction[],
 *   summary:      { owes: Transaction[], owed: Transaction[] },
 *   settled:      boolean,
 *   youOwe:       number,
 *   youAreOwed:   number
 * }}
 */
function getGroupBalanceSummary(group, currentUser) {
  const balances     = computeNetBalances(group.expenses || [], group.members || []);
  const transactions = simplifyDebts(balances);
  const summary      = getUserSummary(transactions, currentUser);
  const settled      = isGroupSettled(balances);
  const youOwe       = totalOwedBy(transactions, currentUser);
  const youAreOwed   = totalOwedTo(transactions, currentUser);

  return { balances, transactions, summary, settled, youOwe, youAreOwed };
}

// ── Dashboard Balance Renderer ────────────────────────────────

const AVATAR_COLORS = ['#F59E0B', '#22C55E', '#EF4444', '#6366F1', '#EC4899', '#14B8A6'];

/**
 * Builds a single balance row element.
 * @param {'owe'|'owed'} type
 * @param {Transaction} t
 * @param {string} color
 * @returns {string} HTML string
 */
function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildBalanceRow(type, t, color) {
  const isOwe   = type === 'owe';
  const name    = isOwe ? t.to   : t.from;
  const safeName = escapeHTML(name);
  const label   = isOwe ? `You owe <strong>${safeName}</strong>` : `<strong>${safeName}</strong> owes you`;
  const cls     = isOwe ? 'text-red'   : 'text-green';
  const prefix  = isOwe ? '−' : '+';

  const settleBtn = isOwe
    ? `<button class="settle-btn" title="Settle up with ${safeName}" onclick="this.classList.toggle('settling'); setTimeout(() => window.handleSettle('${t.groupId}', '${t.from}', '${t.to}', ${t.amount}), 500)">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
         Settle Up
       </button>`
    : `<button class="settle-btn settle-btn-receive" title="Mark received from ${safeName}" onclick="this.classList.toggle('settling'); setTimeout(() => window.handleSettle('${t.groupId}', '${t.from}', '${t.to}', ${t.amount}), 500)">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
         Received
       </button>`;

  return `
    <div class="balance-row">
      <div class="balance-who">
        <div class="avatar-sm" style="background:${color}">${name.charAt(0).toUpperCase()}</div>
        <div class="balance-info"><p>${label}</p></div>
      </div>
      <div class="balance-row-right">
        <span class="balance-amount ${cls}">${prefix}${formatCurrency(t.amount)}</span>
        ${settleBtn}
      </div>
    </div>`;
}

/**
 * Renders the balance summary section on the dashboard.
 * Shows net totals bar + individual rows + smart settle tip.
 *
 * @param {Transaction[]} transactions
 * @param {string}        currentUser
 */
function renderBalanceSummary(transactions, currentUser) {
  const listEl = document.getElementById('balance-list');
  const tipEl  = document.getElementById('settle-tip-body');
  if (!listEl) return;

  const { owes, owed } = getUserSummary(transactions, currentUser);
  const youOwe       = totalOwedBy(transactions, currentUser);
  const youAreOwed   = totalOwedTo(transactions, currentUser);
  const netBalance   = round2(youAreOwed - youOwe);

  listEl.innerHTML = '';

  // ── Fully settled state ──
  if (owes.length === 0 && owed.length === 0) {
    listEl.innerHTML = `
      <div style="text-align:center;padding:24px 0;color:var(--primary-green);">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          style="margin-bottom:10px;display:block;margin-inline:auto;">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p style="font-weight:700;font-size:15px;">You're all settled up! 🎉</p>
        <p style="font-size:12px;color:var(--muted-gray);margin-top:4px;">No pending balances.</p>
      </div>`;
    if (tipEl) tipEl.closest('.settle-tip') && (tipEl.closest('.settle-tip').style.display = 'none');
    return;
  }

  // ── Net balance summary bar ──
  const barColor  = netBalance >= 0 ? 'var(--primary-green)' : '#EF4444';
  const barLabel  = netBalance >= 0
    ? `Net: you are owed <strong style="color:var(--primary-green)">${formatCurrency(netBalance)}</strong>`
    : `Net: you owe <strong style="color:#EF4444">${formatCurrency(Math.abs(netBalance))}</strong>`;

  listEl.innerHTML = `
    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;
                padding:10px 14px;margin-bottom:12px;font-size:13px;color:var(--light-gray);">
      ${barLabel}
    </div>`;

  // ── What you owe ──
  let colorIdx = 0;
  owes.forEach(t => {
    listEl.innerHTML += buildBalanceRow('owe', t, AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length]);
  });

  // ── What others owe you ──
  owed.forEach(t => {
    listEl.innerHTML += buildBalanceRow('owed', t, AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length]);
  });

  // ── Smart settle tip ──
  if (tipEl && transactions.length > 0) {
    const tips = transactions
      .map(t => `<strong>${t.from}</strong> → <strong>${t.to}</strong> ${formatCurrency(t.amount)}`)
      .join(' &nbsp;·&nbsp; ');
    tipEl.innerHTML = `Quickest way to settle up: ${tips}`;
    const tipContainer = tipEl.closest('.settle-tip');
    if (tipContainer) tipContainer.style.display = '';
  }
}

// ── Exports ───────────────────────────────────────────────────
export {
  formatCurrency,
  round2,
  computeNetBalances,
  isGroupSettled,
  simplifyDebts,
  getUserSummary,
  totalExpenses,
  totalPaidBy,
  totalOwedBy,
  totalOwedTo,
  categoryBreakdown,
  getGroupBalanceSummary,
  renderBalanceSummary,
};
