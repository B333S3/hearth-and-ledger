// store.js — the household's data: accounts, categories, budgets, transactions, bills and goals.
// Holds the seed figures the site opens with, persists every change to localStorage,
// and answers the questions the views ask (month totals, per-category spend, bill status).

import { monthKeyOf, todayISO } from './money.js';

const STORAGE_KEY = 'hearth-ledger-v1';

export const CATEGORIES = [
  { id: 'housing', name: 'Housing', color: '#8A5A33', icon: '⌂' },
  { id: 'groceries', name: 'Groceries', color: '#2E7D5B', icon: '❦' },
  { id: 'dining', name: 'Dining Out', color: '#C4622D', icon: '✦' },
  { id: 'transport', name: 'Transport', color: '#4A6FA5', icon: '➤' },
  { id: 'utilities', name: 'Utilities', color: '#D9A441', icon: '☀' },
  { id: 'kids', name: 'Kids & School', color: '#7D5BA6', icon: '✎' },
  { id: 'health', name: 'Health', color: '#C24B5A', icon: '+' },
  { id: 'fun', name: 'Fun & Streaming', color: '#3E8853', icon: '▶' },
  { id: 'shopping', name: 'Shopping', color: '#B5658F', icon: '❋' },
  { id: 'pets', name: 'Pets', color: '#96762F', icon: '🐾' },
  { id: 'gifts', name: 'Gifts', color: '#A34E21', icon: '🎁' },
  { id: 'other', name: 'Other', color: '#75816F', icon: '•' },
];

export const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salary', color: '#2E7D5B', icon: '$' },
  { id: 'side', name: 'Side Income', color: '#4A6FA5', icon: '$' },
  { id: 'interest', name: 'Interest & Refunds', color: '#D9A441', icon: '$' },
];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || INCOME_CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

// ---------------------------------------------------------------- seed data
// The Parker household: Emma (nurse) and Josh (teacher), two kids, one very good dog.
// Figures run from June 2026 (summaries) with full ledgers for October and November.

function tx(id, date, payee, category, amount, account, note) {
  return { id, date, payee, category, amount, account, note: note || '' };
}

const SEED = {
  household: 'The Parker Household',
  members: 'Emma & Josh, two kids and Biscuit the dog',
  accounts: [
    { id: 'checking', name: 'Everyday Checking', kind: 'bank', balance: 4382.16 },
    { id: 'savings', name: 'Savings — House Fund', kind: 'bank', balance: 12940.55 },
    { id: 'card', name: 'Rewards Credit Card', kind: 'card', balance: -864.20 },
  ],
  budgets: {
    housing: 1850, groceries: 780, dining: 240, transport: 320, utilities: 265,
    kids: 300, health: 180, fun: 120, shopping: 250, pets: 90, gifts: 100, other: 100,
  },
  monthlySummary: [
    { month: '2026-06', income: 6610, spent: 5120 },
    { month: '2026-07', income: 6610, spent: 5485 },
    { month: '2026-08', income: 6790, spent: 5902 },
    { month: '2026-09', income: 6850, spent: 5316 },
    { month: '2026-10', income: 6850, spent: 5144.37 },
    { month: '2026-11', income: 6850, spent: 0 },
  ],
  transactions: [
    // ---- November 2026 (the open month; spending is still being added up by the views)
    tx('n01', '2026-11-01', 'Maple Court Apartments', 'housing', -1850.00, 'checking', 'November rent'),
    tx('n02', '2026-11-01', 'Emma — City Hospital payroll', 'salary', 3425.00, 'checking', 'Monthly salary'),
    tx('n03', '2026-11-01', 'Josh — Lincoln High payroll', 'salary', 2890.00, 'checking', 'Monthly salary'),
    tx('n04', '2026-11-02', 'Kroger', 'groceries', -96.42, 'card', 'Weekly shop'),
    tx('n05', '2026-11-02', 'Shell', 'transport', -48.20, 'card', 'Fuel'),
    tx('n06', '2026-11-03', 'Brightpath Fiber', 'utilities', -59.99, 'checking', 'Internet'),
    tx('n07', '2026-11-04', 'Chipotle', 'dining', -32.75, 'card', 'Lunch with coworkers'),
    tx('n08', '2026-11-05', 'CVS Pharmacy', 'health', -24.60, 'card', 'Prescriptions'),
    tx('n09', '2026-11-06', 'Trader Joe’s', 'groceries', -78.15, 'card', ''),
    tx('n10', '2026-11-06', 'Netflix', 'fun', -15.49, 'card', ''),
    tx('n11', '2026-11-07', 'Amazon', 'shopping', -64.99, 'card', 'Winter boots for Mia'),
    tx('n12', '2026-11-07', 'City Power & Light', 'utilities', -88.34, 'checking', 'Electricity, October use'),
    tx('n13', '2026-11-08', 'The Rustic Oven', 'dining', -86.40, 'card', 'Date night'),
    tx('n14', '2026-11-09', 'Kroger', 'groceries', -112.08, 'card', 'Weekly shop + pantry restock'),
    tx('n15', '2026-11-10', 'SafeRoad Insurance', 'transport', -138.00, 'checking', 'Car insurance'),
    tx('n16', '2026-11-10', 'Riverside Elementary', 'kids', -45.00, 'checking', 'Field trip fees'),
    tx('n17', '2026-11-11', 'Petco', 'pets', -42.37, 'card', 'Biscuit’s food'),
    tx('n18', '2026-11-12', 'Spotify', 'fun', -11.99, 'card', ''),
    tx('n19', '2026-11-12', 'Josh — tutoring', 'side', 260.00, 'checking', 'Evening tutoring, 4 sessions'),
    tx('n20', '2026-11-13', 'Target', 'shopping', -58.23, 'card', 'Household basics'),
    tx('n21', '2026-11-14', 'Sunrise Bakery', 'dining', -18.50, 'card', 'Saturday pastries'),
    tx('n22', '2026-11-14', 'Water Utility', 'utilities', -41.87, 'checking', 'Water & sewer'),
    tx('n23', '2026-11-15', 'Emma — City Hospital payroll', 'salary', 275.00, 'checking', 'Weekend shift bonus'),
    tx('n24', '2026-11-16', 'Kroger', 'groceries', -89.64, 'card', 'Weekly shop'),
    tx('n25', '2026-11-17', 'BP', 'transport', -44.85, 'card', 'Fuel'),
    tx('n26', '2026-11-18', 'Dr. Patel — Dental', 'health', -120.00, 'card', 'Leo’s checkup'),
    tx('n27', '2026-11-19', 'Trader Joe’s', 'groceries', -67.29, 'card', ''),
    tx('n28', '2026-11-20', 'Etsy', 'gifts', -38.00, 'card', 'Mom’s birthday gift'),
    tx('n29', '2026-11-20', 'Hulu', 'fun', -17.99, 'card', ''),
    tx('n30', '2026-11-21', 'Home Depot', 'other', -73.46, 'card', 'Bathroom faucet repair'),
    tx('n31', '2026-11-22', 'Noodles & Company', 'dining', -41.20, 'card', 'Family dinner out'),
    tx('n32', '2026-11-23', 'Kroger', 'groceries', -104.52, 'card', 'Thanksgiving shop, part 1'),
    tx('n33', '2026-11-24', 'Scholastic Book Fair', 'kids', -36.75, 'card', 'Books for both kids'),
    tx('n34', '2026-11-24', 'T-Mobile', 'utilities', -74.50, 'checking', 'Two lines'),
    tx('n35', '2026-11-25', 'Whole Foods', 'groceries', -58.90, 'card', 'Thanksgiving shop, part 2'),
    tx('n36', '2026-11-25', 'Transfer to savings', 'other', -300.00, 'checking', 'Monthly savings transfer'),
    tx('n37', '2026-11-26', 'The Corner Cafe', 'dining', -12.80, 'card', 'Coffee with Sam'),
    // ---- October 2026 (complete month, for comparisons)
    tx('o01', '2026-10-01', 'Maple Court Apartments', 'housing', -1850.00, 'checking', 'October rent'),
    tx('o02', '2026-10-01', 'Emma — City Hospital payroll', 'salary', 3425.00, 'checking', 'Monthly salary'),
    tx('o03', '2026-10-01', 'Josh — Lincoln High payroll', 'salary', 2890.00, 'checking', 'Monthly salary'),
    tx('o04', '2026-10-03', 'Kroger', 'groceries', -101.36, 'card', ''),
    tx('o05', '2026-10-04', 'Shell', 'transport', -46.90, 'card', 'Fuel'),
    tx('o06', '2026-10-05', 'Brightpath Fiber', 'utilities', -59.99, 'checking', 'Internet'),
    tx('o07', '2026-10-06', 'CVS Pharmacy', 'health', -31.25, 'card', ''),
    tx('o08', '2026-10-08', 'Trader Joe’s', 'groceries', -82.44, 'card', ''),
    tx('o09', '2026-10-09', 'Netflix', 'fun', -15.49, 'card', ''),
    tx('o10', '2026-10-10', 'City Power & Light', 'utilities', -92.17, 'checking', 'Electricity'),
    tx('o11', '2026-10-11', 'Olive Garden', 'dining', -64.30, 'card', 'Family dinner'),
    tx('o12', '2026-10-12', 'Kroger', 'groceries', -95.18, 'card', ''),
    tx('o13', '2026-10-13', 'SafeRoad Insurance', 'transport', -138.00, 'checking', 'Car insurance'),
    tx('o14', '2026-10-14', 'Petco', 'pets', -39.98, 'card', 'Biscuit’s food'),
    tx('o15', '2026-10-15', 'Josh — tutoring', 'side', 240.00, 'checking', 'Evening tutoring'),
    tx('o16', '2026-10-16', 'Target', 'shopping', -88.41, 'card', 'Kids’ fall clothes'),
    tx('o17', '2026-10-17', 'Spotify', 'fun', -11.99, 'card', ''),
    tx('o18', '2026-10-18', 'Riverside Elementary', 'kids', -120.00, 'checking', 'After-school club, both kids'),
    tx('o19', '2026-10-19', 'Kroger', 'groceries', -108.72, 'card', ''),
    tx('o20', '2026-10-20', 'Water Utility', 'utilities', -39.64, 'checking', 'Water & sewer'),
    tx('o21', '2026-10-21', 'BP', 'transport', -42.30, 'card', 'Fuel'),
    tx('o22', '2026-10-22', 'Interest — savings', 'interest', 35.00, 'savings', 'Monthly interest'),
    tx('o23', '2026-10-23', 'Trader Joe’s', 'groceries', -71.05, 'card', ''),
    tx('o24', '2026-10-24', 'Papa John’s', 'dining', -28.45, 'card', 'Pizza night'),
    tx('o25', '2026-10-25', 'Hulu', 'fun', -17.99, 'card', ''),
    tx('o26', '2026-10-26', 'Kroger', 'groceries', -92.60, 'card', ''),
    tx('o27', '2026-10-27', 'T-Mobile', 'utilities', -74.50, 'checking', 'Two lines'),
    tx('o28', '2026-10-28', 'Costume City', 'kids', -54.20, 'card', 'Halloween costumes'),
    tx('o29', '2026-10-29', 'Amazon', 'shopping', -47.99, 'card', 'Phone case + cable'),
    tx('o30', '2026-10-30', 'Transfer to savings', 'other', -300.00, 'checking', 'Monthly savings transfer'),
    tx('o31', '2026-10-31', 'Neighborhood Bakery', 'dining', -16.25, 'card', 'Halloween treats'),
  ],
  bills: [
    { id: 'b1', name: 'Rent — Maple Court Apartments', category: 'housing', amount: 1850.00, dueDay: 1, autopay: true, paidMonths: ['2026-10', '2026-11'] },
    { id: 'b2', name: 'City Power & Light (electric)', category: 'utilities', amount: 96.40, dueDay: 28, autopay: false, paidMonths: ['2026-10'] },
    { id: 'b3', name: 'Brightpath Fiber (internet)', category: 'utilities', amount: 59.99, dueDay: 3, autopay: true, paidMonths: ['2026-10', '2026-11'] },
    { id: 'b4', name: 'Water Utility', category: 'utilities', amount: 42.18, dueDay: 6, autopay: false, paidMonths: ['2026-10', '2026-11'] },
    { id: 'b5', name: 'SafeRoad car insurance', category: 'transport', amount: 138.00, dueDay: 10, autopay: true, paidMonths: ['2026-10', '2026-11'] },
    { id: 'b6', name: 'T-Mobile (two lines)', category: 'utilities', amount: 74.50, dueDay: 24, autopay: true, paidMonths: ['2026-10', '2026-11'] },
    { id: 'b7', name: 'Netflix', category: 'fun', amount: 15.49, dueDay: 30, autopay: true, paidMonths: ['2026-10'] },
    { id: 'b8', name: 'FitLife Gym (Emma)', category: 'health', amount: 39.00, dueDay: 15, autopay: true, paidMonths: ['2026-10', '2026-11'] },
  ],
  goals: [
    { id: 'g1', name: 'Emergency fund', target: 15000, saved: 11240.55, monthly: 300, note: 'Six months of essentials, kept in the house savings account. The $300 monthly transfer lands here first.' },
    { id: 'g2', name: 'Summer road trip — Oregon coast', target: 2400, saved: 860, monthly: 150, note: 'Cabin near Cannon Beach, whale watching, and one very good seafood dinner.' },
    { id: 'g3', name: 'Christmas gifts', target: 600, saved: 470, monthly: 65, note: 'Both sets of grandparents, the kids, and the nieces. The last top-up lands in January — this year there is no December card balance to meet it.' },
    { id: 'g4', name: 'New laptop for Josh', target: 1300, saved: 415, monthly: 75, note: 'The current one’s battery lasts about one class period. Replacement planned for spring sales.' },
  ],
};

// ---------------------------------------------------------------- state

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // A stored copy is only trusted when every collection the views read
      // is present; a half-written value falls back to the seed instead of
      // crashing a page that maps over a missing array.
      if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.bills) && Array.isArray(parsed.goals)) return parsed;
    }
  } catch { /* first visit or cleared storage: fall through to the seed */ }
  return structuredClone(SEED);
}

export function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked: the site still works for the session */ }
}

export function resetAll() {
  state = structuredClone(SEED);
  save();
}

// Swap the whole household record for an imported snapshot. The snapshot is
// only accepted when every collection the views read is present and shaped
// right; a bad file leaves the current figures untouched and reports false.
export function replaceState(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const { transactions, bills, goals, accounts } = snapshot;
  if (!Array.isArray(transactions) || !Array.isArray(bills) || !Array.isArray(goals) || !Array.isArray(accounts)) return false;
  if (!transactions.every((t) => t && typeof t.id === 'string' && typeof t.date === 'string' && Number.isFinite(t.amount))) return false;
  if (!bills.every((b) => b && typeof b.id === 'string' && Array.isArray(b.paidMonths))) return false;
  if (!goals.every((g) => g && typeof g.id === 'string' && Number.isFinite(g.saved) && Number.isFinite(g.target))) return false;
  state = {
    household: typeof snapshot.household === 'string' ? snapshot.household : state.household,
    members: typeof snapshot.members === 'string' ? snapshot.members : state.members,
    accounts: structuredClone(accounts),
    budgets: snapshot.budgets && typeof snapshot.budgets === 'object' ? structuredClone(snapshot.budgets) : state.budgets,
    monthlySummary: Array.isArray(snapshot.monthlySummary) ? structuredClone(snapshot.monthlySummary) : state.monthlySummary,
    transactions: structuredClone(transactions),
    bills: structuredClone(bills),
    goals: structuredClone(goals),
    billPayments: Array.isArray(snapshot.billPayments) ? structuredClone(snapshot.billPayments) : [],
  };
  save();
  return true;
}

export function getState() { return state; }

let uidCounter = 1000;
export function addTransaction(data) {
  const entry = { id: 'u' + (++uidCounter) + Date.now().toString(36), ...data };
  state.transactions.push(entry);
  save();
  return entry;
}

export function updateTransaction(id, data) {
  const entry = state.transactions.find((t) => t.id === id);
  if (entry) { Object.assign(entry, data); save(); }
}

export function deleteTransaction(id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  save();
}

export function setBudget(categoryId, amount) {
  state.budgets[categoryId] = amount;
  save();
}

export function toggleBillPaid(billId, monthKey, paid) {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill) return;
  const set = new Set(bill.paidMonths);
  if (paid) set.add(monthKey); else set.delete(monthKey);
  bill.paidMonths = [...set];
  save();
}

// Record a real payment against a bill: tick the month as paid and keep the
// receipt (amount actually sent, and the day it went out) in the household's
// payment log, so the Bills page can show what was paid and when.
export function recordBillPayment(billId, monthKey, amount, paidOn) {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill) return null;
  const clean = Math.round(amount * 100) / 100;
  if (!Number.isFinite(clean) || clean <= 0) return null;
  const day = typeof paidOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(paidOn) ? paidOn : todayISO();
  if (!Array.isArray(state.billPayments)) state.billPayments = [];
  const receipt = { billId, month: monthKey, amount: clean, date: day };
  state.billPayments.push(receipt);
  const set = new Set(bill.paidMonths);
  set.add(monthKey);
  bill.paidMonths = [...set];
  save();
  return receipt;
}

export function billPaymentsFor(billId) {
  if (!Array.isArray(state.billPayments)) return [];
  return state.billPayments
    .filter((entry) => entry.billId === billId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function allBillPayments() {
  if (!Array.isArray(state.billPayments)) return [];
  return [...state.billPayments].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function addToGoal(goalId, amount) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (goal) { goal.saved = Math.round((goal.saved + amount) * 100) / 100; save(); }
}

// Feed a goal and keep the receipt: the contribution is appended to the
// goal's own history (created the first time it is needed) with today's date,
// so the Goals page can show every top-up instead of only the running total.
export function recordGoalContribution(goalId, amount, note) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return null;
  const clean = Math.round(amount * 100) / 100;
  if (!Number.isFinite(clean) || clean <= 0) return null;
  if (!Array.isArray(goal.history)) goal.history = [];
  goal.history.push({ date: todayISO(), amount: clean, note: typeof note === 'string' ? note : '' });
  goal.saved = Math.round((goal.saved + clean) * 100) / 100;
  save();
  return goal.history[goal.history.length - 1];
}

export function goalHistory(goalId) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal || !Array.isArray(goal.history)) return [];
  return [...goal.history].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function goalContributedTotal(goalId) {
  return goalHistory(goalId).reduce((sum, entry) => sum + entry.amount, 0);
}

// ---------------------------------------------------------------- queries

export function transactionsInMonth(monthKey) {
  return state.transactions
    .filter((t) => monthKeyOf(t.date) === monthKey)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Every entry whose date falls inside an inclusive ISO range, newest first.
// An empty bound means "no limit on that side", so a single-sided range is
// just a call with one end left blank.
export function transactionsInRange(startIso, endIso) {
  return state.transactions
    .filter((t) => {
      if (startIso && t.date < startIso) return false;
      if (endIso && t.date > endIso) return false;
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function monthIncome(monthKey) {
  return transactionsInMonth(monthKey)
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function monthSpent(monthKey) {
  return transactionsInMonth(monthKey)
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum - t.amount, 0);
}

export function spentByCategory(monthKey) {
  const totals = {};
  for (const t of transactionsInMonth(monthKey)) {
    if (t.amount < 0) totals[t.category] = (totals[t.category] || 0) - t.amount;
  }
  return totals;
}

export function totalBudget() {
  return Object.values(state.budgets).reduce((a, b) => a + b, 0);
}

export function netWorth() {
  return state.accounts.reduce((sum, a) => sum + a.balance, 0);
}

// The June–September rows are stored summaries; October/November are computed
// from the ledger so the Insights chart always agrees with the Transactions page.
export function sixMonthTrend() {
  return state.monthlySummary.map((row) => {
    if (row.month === '2026-10' || row.month === '2026-11') {
      return { month: row.month, income: monthIncome(row.month), spent: monthSpent(row.month) };
    }
    return row;
  });
}

export function billDueDate(bill, monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const day = Math.min(bill.dueDay, new Date(y, m, 0).getDate());
  const mm = String(m).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return y + '-' + mm + '-' + dd;
}

export function billIsPaid(bill, monthKey) {
  return bill.paidMonths.includes(monthKey);
}
