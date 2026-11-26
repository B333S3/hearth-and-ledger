// view-bills.js — the Bills page: every recurring bill with its due day, amount
// and autopay status. The checkbox is the real thing: marking a bill paid here
// clears it from the Overview's "Coming due" list and from this month's totals.

import { getState, billDueDate, billIsPaid, toggleBillPaid, categoryById } from './store.js';
import { fmtMoney, fmtWhole, fmtDay, daysUntil, escapeHtml } from './money.js';
import { toast } from './forms.js';

function duePill(dueIso, paid) {
  if (paid) return '<span class="pill">Paid ✓</span>';
  const d = daysUntil(dueIso);
  if (d < 0) return `<span class="pill pill-bad">${-d} day${-d === 1 ? '' : 's'} overdue</span>`;
  if (d === 0) return '<span class="pill pill-warn">Due today</span>';
  if (d <= 5) return `<span class="pill pill-warn">Due in ${d} days</span>`;
  return `<span class="pill pill-plain">Due ${fmtDay(dueIso)}</span>`;
}

export function renderBills(monthKey) {
  const state = getState();
  const rows = state.bills
    .map((b) => ({ bill: b, due: billDueDate(b, monthKey), paid: billIsPaid(b, monthKey) }))
    .sort((a, b) => (a.due < b.due ? -1 : 1));

  const totalAll = rows.reduce((s, x) => s + x.bill.amount, 0);
  const totalPaid = rows.filter((x) => x.paid).reduce((s, x) => s + x.bill.amount, 0);
  const unpaid = rows.filter((x) => !x.paid);

  const list = rows.map(({ bill, due, paid }) => {
    const cat = categoryById(bill.category);
    const [y, m, d] = due.split('-').map(Number);
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
    return `<div class="bill-row">
      <input class="check" type="checkbox" data-bill="${bill.id}" ${paid ? 'checked' : ''} aria-label="Mark ${escapeHtml(bill.name)} as paid">
      <div class="bill-date"><b>${d}</b><span>${monthShort}</span></div>
      <div class="bill-main">
        <p><b>${escapeHtml(bill.name)}</b></p>
        <p class="sub"><span class="cat-dot" style="background:${cat.color}"></span>${cat.name} · ${bill.autopay ? 'Autopay — leaves the account by itself' : 'Manual — pay it from the provider’s site or app'}</p>
      </div>
      ${duePill(due, paid)}
      <b>${fmtMoney(bill.amount)}</b>
    </div>`;
  }).join('');

  const next = unpaid[0];
  return `
  <div class="page-head">
    <h1>Bills &amp; due dates</h1>
    <p>The fixed heartbeat of the household: eight recurring bills, ${fmtWhole(totalAll)} a month. Tick one off when it is paid — autopay bills count as paid when the money leaves, manual ones when you have actually sent it.</p>
  </div>
  <div class="grid grid-3">
    <div class="card"><p class="stat-label">Bills this month</p><p class="stat-value">${fmtWhole(totalAll)}</p><p class="stat-note">${rows.length} recurring bills</p></div>
    <div class="card"><p class="stat-label">Already paid</p><p class="stat-value pos">${fmtWhole(totalPaid)}</p><p class="stat-note">${rows.filter((x) => x.paid).length} of ${rows.length} settled</p></div>
    <div class="card"><p class="stat-label">Next due</p><p class="stat-value" style="font-size:23px">${next ? escapeHtml(next.bill.name.split('(')[0].trim()) : '—'}</p><p class="stat-note">${next ? fmtMoney(next.bill.amount) + ' · due ' + fmtDay(next.due) + (daysUntil(next.due) >= 0 ? ' (in ' + daysUntil(next.due) + ' days)' : ' (overdue)') : 'Nothing outstanding'}</p></div>
  </div>
  <div class="card" style="margin-top:16px">
    ${list}
    <p class="mini-note" style="margin-top:12px">House rule: the electric bill is the only one left on manual pay, on purpose — reading the meter line each month is how the Parkers caught a billing error in August and got $34 back.</p>
  </div>`;
}

export function bindBills(monthKey, rerender) {
  document.querySelectorAll('[data-bill]').forEach((box) => {
    box.addEventListener('change', () => {
      toggleBillPaid(box.dataset.bill, monthKey, box.checked);
      toast(box.checked ? 'Bill marked as paid' : 'Bill marked as unpaid');
      rerender(false);
    });
  });
}
