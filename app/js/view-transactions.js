// view-transactions.js — the Ledger: every entry in the chosen month, searchable
// by payee or note, filterable by category, with working add, edit and delete.
// The totals strip always matches the rows on screen, so a filter doubles as a
// quick answer ("how much went to Kroger this month?").

import {
  CATEGORIES, INCOME_CATEGORIES, transactionsInMonth, categoryById, deleteTransaction, getState,
} from './store.js';
import { fmtMoney, fmtSigned, fmtDay, escapeHtml } from './money.js';
import { openTransactionModal, toast } from './forms.js';
import { bindDataTools } from './data-tools.js';

let query = '';
let filterCat = 'all';
let rangeStart = '';
let rangeEnd = '';
let sortMode = 'newest';

const SORT_LABELS = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  largest: 'Largest amount',
  smallest: 'Smallest amount',
};

function sortRows(rows) {
  const copy = [...rows];
  if (sortMode === 'oldest') return copy.sort((a, b) => (a.date < b.date ? -1 : 1));
  if (sortMode === 'largest') return copy.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  if (sortMode === 'smallest') return copy.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
  return copy.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function categorySubtotals(rows) {
  const totals = {};
  for (const entry of rows) {
    if (entry.amount < 0) totals[entry.category] = (totals[entry.category] || 0) - entry.amount;
  }
  return Object.entries(totals)
    .map(([id, total]) => ({ cat: categoryById(id), total }))
    .sort((a, b) => b.total - a.total);
}

export function renderTransactions(monthKey) {
  const all = transactionsInMonth(monthKey);
  const ranged = all.filter((t) => {
    if (rangeStart && t.date < rangeStart) return false;
    if (rangeEnd && t.date > rangeEnd) return false;
    return true;
  });
  const rows = sortRows(ranged.filter((t) => {
    if (filterCat !== 'all' && t.category !== filterCat) return false;
    if (query) {
      const hay = (t.payee + ' ' + t.note + ' ' + categoryById(t.category).name).toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  }));

  const inSum = rows.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const outSum = rows.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  const subtotals = categorySubtotals(rows);
  const subtotalHtml = subtotals.length ? subtotals.slice(0, 4).map(({ cat, total }) =>
    `<div class="bill-row"><span class="cat-dot" style="background:${cat.color}"></span><div class="bill-main"><p>${cat.name}</p></div><b>${fmtMoney(total)}</b></div>`).join('')
    + (subtotals.length > 4 ? `<p class="mini-note" style="margin-top:8px">Plus ${subtotals.length - 4} more categor${subtotals.length - 4 === 1 ? 'y' : 'ies'} in the rows on screen.</p>` : '')
    : '<p class="mini-note">No spending in the rows on screen — nothing to break down.</p>';
  const rangeActive = rangeStart || rangeEnd;
  const sortOptions = Object.entries(SORT_LABELS).map(([value, label]) =>
    `<option value="${value}" ${sortMode === value ? 'selected' : ''}>${label}</option>`).join('');

  const body = rows.length ? rows.map((t) => {
    const cat = categoryById(t.category);
    return `<tr>
      <td style="white-space:nowrap">${fmtDay(t.date)}</td>
      <td><b>${escapeHtml(t.payee)}</b>${t.note ? `<br><span class="mini-note">${escapeHtml(t.note)}</span>` : ''}</td>
      <td><span class="cat-dot" style="background:${cat.color}"></span>${cat.name}</td>
      <td>${accountName(t.account)}</td>
      <td class="amount ${t.amount > 0 ? 'pos' : ''}">${fmtSigned(t.amount)}</td>
      <td class="row-actions">
        <button class="icon-btn" data-edit="${t.id}" type="button" title="Edit" aria-label="Edit ${escapeHtml(t.payee)}">✎</button>
        <button class="icon-btn" data-delete="${t.id}" type="button" title="Delete" aria-label="Delete ${escapeHtml(t.payee)}">✕</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="6" style="padding:22px 8px;text-align:center;color:var(--muted)">No entries match. Try a different search — or add the transaction you are looking for.</td></tr>`;

  const options = ['<option value="all">All categories</option>']
    .concat(CATEGORIES.map((c) => `<option value="${c.id}" ${filterCat === c.id ? 'selected' : ''}>${c.name}</option>`))
    .concat(INCOME_CATEGORIES.map((c) => `<option value="${c.id}" ${filterCat === c.id ? 'selected' : ''}>${c.name}</option>`))
    .join('');

  return `
  <div class="page-head">
    <h1>The ledger</h1>
    <p>Every dollar in and out, newest first. This is the same list the Overview, Budget and Insights pages are computed from — edit anything here and they all agree.</p>
  </div>
  <div class="toolbar">
    <div class="search-box"><input id="tx-search" type="search" placeholder="Search payee, note or category…" value="${escapeHtml(query)}" aria-label="Search transactions"></div>
    <select id="tx-filter" class="inline-input" aria-label="Filter by category">${options}</select>
    <span class="spacer"></span>
    <button class="btn btn-primary" id="tx-add" type="button">+ Add transaction</button>
  </div>
  <div class="toolbar">
    <label class="sub" for="tx-from">From <input id="tx-from" class="inline-input" type="date" value="${rangeStart}" aria-label="Show entries from this date"></label>
    <label class="sub" for="tx-to">to <input id="tx-to" class="inline-input" type="date" value="${rangeEnd}" aria-label="Show entries up to this date"></label>
    ${rangeActive ? '<button class="btn btn-small" id="tx-range-clear" type="button">Clear dates</button>' : ''}
    <select id="tx-sort" class="inline-input" aria-label="Sort transactions">${sortOptions}</select>
    <span class="spacer"></span>
    <button class="btn btn-small" id="data-export" type="button">Export JSON</button>
    <button class="btn btn-small" id="data-export-csv" type="button">Export CSV</button>
    <button class="btn btn-small" id="data-import-btn" type="button">Import JSON</button>
    <button class="btn btn-small" id="data-import-csv-btn" type="button">Import CSV</button>
    <input id="data-import-file" type="file" accept="application/json,.json" hidden>
    <input id="data-import-csv-file" type="file" accept="text/csv,.csv" hidden>
    <button class="btn btn-small" id="data-reset" type="button">Reset data</button>
  </div>
  <div class="grid grid-3">
    <div class="card"><p class="stat-label">Showing</p><p class="stat-value">${rows.length}</p><p class="stat-note">of ${all.length} entries this month${rangeActive ? ' in the chosen dates' : ''}</p></div>
    <div class="card"><p class="stat-label">Money in (shown)</p><p class="stat-value pos">${fmtMoney(inSum)}</p><p class="stat-note">Income among the rows on screen</p></div>
    <div class="card"><p class="stat-label">Money out (shown)</p><p class="stat-value">${fmtMoney(outSum)}</p><p class="stat-note">Spending among the rows on screen</p></div>
  </div>
  <div class="card" style="margin-top:16px">
    <h2>Spending breakdown — rows on screen</h2>
    <p class="sub">The same filters as the table above, added up by category. Narrow the dates or the category and this answers itself.</p>
    ${subtotalHtml}
  </div>
  <div class="card" style="margin-top:16px">
    <table class="ledger">
      <thead><tr><th>Date</th><th>Payee</th><th>Category</th><th>Account</th><th class="amount">Amount</th><th></th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

function accountName(id) {
  // Read the name from the store, not a hardcoded map, so a renamed account
  // shows its real name here too.
  return getState().accounts.find((a) => a.id === id)?.name || id;
}

export function bindTransactions(rerender) {
  const search = document.getElementById('tx-search');
  if (search) search.addEventListener('input', () => {
    query = search.value;
    rerender(false);
    const el = document.getElementById('tx-search');
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });
  const filter = document.getElementById('tx-filter');
  if (filter) filter.addEventListener('change', () => { filterCat = filter.value; rerender(false); });
  const from = document.getElementById('tx-from');
  if (from) from.addEventListener('change', () => {
    rangeStart = from.value;
    if (rangeEnd && rangeStart && rangeStart > rangeEnd) rangeEnd = rangeStart;
    rerender(false);
  });
  const to = document.getElementById('tx-to');
  if (to) to.addEventListener('change', () => {
    rangeEnd = to.value;
    if (rangeStart && rangeEnd && rangeEnd < rangeStart) rangeStart = rangeEnd;
    rerender(false);
  });
  const clearRange = document.getElementById('tx-range-clear');
  if (clearRange) clearRange.addEventListener('click', () => { rangeStart = ''; rangeEnd = ''; rerender(false); });
  const sort = document.getElementById('tx-sort');
  if (sort) sort.addEventListener('change', () => { sortMode = sort.value; rerender(false); });
  bindDataTools(rerender);
  const add = document.getElementById('tx-add');
  if (add) add.addEventListener('click', () => openTransactionModal());
  document.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = getState().transactions.find((x) => x.id === btn.dataset.edit) || null;
      if (t) openTransactionModal(t);
    });
  });
  document.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteTransaction(btn.dataset.delete);
      toast('Transaction deleted');
      rerender(false);
    });
  });
}
