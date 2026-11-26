// forms.js — the add/edit transaction modal and the toast. One form serves the
// Overview, the Transactions page and the top bar button; saving re-renders the
// current view through the callback the router registers here.

import { CATEGORIES, INCOME_CATEGORIES, getState, addTransaction, updateTransaction } from './store.js';
import { escapeHtml, todayISO } from './money.js';

let onSaved = () => {};
export function setSavedHandler(fn) { onSaved = fn; }

export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove('show'), 2400);
}

function categoryOptions(selectedId) {
  const group = (label, cats) =>
    `<optgroup label="${label}">` + cats.map((c) =>
      `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`).join('') + '</optgroup>';
  return group('Spending', CATEGORIES) + group('Income', INCOME_CATEGORIES);
}

function accountOptions(selectedId) {
  return getState().accounts.map((a) =>
    `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.name}</option>`).join('');
}

// Opens the modal. With no argument it adds a new transaction dated today;
// with a transaction it edits that row. Amount is typed as a positive number;
// the category decides whether it counts as income or spending.
export function openTransactionModal(existing) {
  const root = document.getElementById('modal-root');
  const isIncome = existing ? existing.amount > 0 : false;
  const t = existing || { date: todayISO(), payee: '', category: 'groceries', amount: '', account: 'card', note: '' };
  root.innerHTML = `
  <div class="modal-backdrop" id="modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">${existing ? 'Edit transaction' : 'Add a transaction'}</h2>
      <form id="tx-form">
        <div class="field">
          <label for="f-payee">Paid to / received from</label>
          <input id="f-payee" required maxlength="60" value="${escapeHtml(t.payee)}" placeholder="e.g. Kroger, or Emma — payroll">
        </div>
        <div class="form-row">
          <div class="field">
            <label for="f-amount">Amount ($)</label>
            <input id="f-amount" required type="number" min="0.01" step="0.01" value="${existing ? Math.abs(t.amount) : ''}" placeholder="0.00">
          </div>
          <div class="field">
            <label for="f-date">Date</label>
            <input id="f-date" required type="date" min="2026-06-01" max="2026-12-31" value="${t.date}">
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="f-category">Category</label>
            <select id="f-category">${categoryOptions(t.category)}</select>
          </div>
          <div class="field">
            <label for="f-account">Account</label>
            <select id="f-account">${accountOptions(t.account)}</select>
          </div>
        </div>
        <div class="field">
          <label for="f-note">Note (optional)</label>
          <input id="f-note" maxlength="80" value="${escapeHtml(t.note)}" placeholder="What was it for?">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${existing ? 'Save changes' : 'Add transaction'}</button>
        </div>
      </form>
    </div>
  </div>`;

  const close = () => { root.innerHTML = ''; };
  document.getElementById('modal-cancel').addEventListener('click', close);
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') close();
  });
  document.getElementById('tx-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('f-category').value;
    const income = INCOME_CATEGORIES.some((c) => c.id === category);
    const magnitude = Math.abs(parseFloat(document.getElementById('f-amount').value) || 0);
    if (!Number.isFinite(magnitude)) return;
    const data = {
      payee: document.getElementById('f-payee').value.trim(),
      amount: income ? magnitude : -magnitude,
      date: document.getElementById('f-date').value,
      category,
      account: document.getElementById('f-account').value,
      note: document.getElementById('f-note').value.trim(),
    };
    if (!data.payee || magnitude <= 0 || !data.date) return;
    if (existing) { updateTransaction(existing.id, data); toast('Transaction updated'); }
    else { addTransaction(data); toast('Transaction added'); }
    close();
    onSaved(data.date);
  });
  document.getElementById('f-payee').focus();
}
