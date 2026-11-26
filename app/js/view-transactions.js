// view-transactions.js — the Ledger: every entry in the chosen month, searchable
// by payee or note, filterable by category, with working add, edit and delete.
// The totals strip always matches the rows on screen, so a filter doubles as a
// quick answer ("how much went to Kroger this month?").

import {
  CATEGORIES, INCOME_CATEGORIES, transactionsInMonth, categoryById, deleteTransaction, getState,
} from './store.js';
import { fmtMoney, fmtSigned, fmtDay, escapeHtml } from './money.js';
import { openTransactionModal, toast } from './forms.js';

let query = '';
let filterCat = 'all';

export function renderTransactions(monthKey) {
  const all = transactionsInMonth(monthKey);
  const rows = all.filter((t) => {
    if (filterCat !== 'all' && t.category !== filterCat) return false;
    if (query) {
      const hay = (t.payee + ' ' + t.note + ' ' + categoryById(t.category).name).toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  const inSum = rows.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const outSum = rows.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);

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
  <div class="grid grid-3">
    <div class="card"><p class="stat-label">Showing</p><p class="stat-value">${rows.length}</p><p class="stat-note">of ${all.length} entries this month</p></div>
    <div class="card"><p class="stat-label">Money in (shown)</p><p class="stat-value pos">${fmtMoney(inSum)}</p><p class="stat-note">Income among the rows on screen</p></div>
    <div class="card"><p class="stat-label">Money out (shown)</p><p class="stat-value">${fmtMoney(outSum)}</p><p class="stat-note">Spending among the rows on screen</p></div>
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
