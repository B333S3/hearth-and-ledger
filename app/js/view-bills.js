// view-bills.js — the Bills page: every recurring bill with its due day, amount
// and autopay status. The checkbox is the real thing: marking a bill paid here
// clears it from the Overview's "Coming due" list and from this month's totals.

import {
  getState, billDueDate, billIsPaid, toggleBillPaid, categoryById,
  recordBillPayment, billPaymentsFor, allBillPayments,
} from './store.js';
import { fmtMoney, fmtWhole, fmtDay, daysUntil, todayISO, escapeHtml } from './money.js';
import { toast } from './forms.js';

function duePill(dueIso, paid) {
  if (paid) return '<span class="pill">Paid ✓</span>';
  const d = daysUntil(dueIso);
  if (d < 0) return `<span class="pill pill-bad">${-d} day${-d === 1 ? '' : 's'} overdue</span>`;
  if (d === 0) return '<span class="pill pill-warn">Due today</span>';
  if (d <= 5) return `<span class="pill pill-warn">Due in ${d} days</span>`;
  return `<span class="pill pill-plain">Due ${fmtDay(dueIso)}</span>`;
}

// The latest receipt for one bill, if the household has recorded any payment
// against it (the seed bills start with none — the line appears once the
// first payment is recorded on this page).
function lastPaymentHtml(bill) {
  const receipts = billPaymentsFor(bill.id);
  if (!receipts.length) return '';
  const latest = receipts[0];
  return `<p class="sub">Last paid ${fmtMoney(latest.amount)} on ${fmtDay(latest.date)}${receipts.length > 1 ? ` · ${receipts.length} payments recorded` : ''}</p>`;
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
    const payForm = paid ? '' : `<form class="toolbar" data-pay-form="${bill.id}" style="margin:8px 0 0">
      <input class="inline-input" type="number" min="0.01" step="0.01" value="${bill.amount.toFixed(2)}" aria-label="Amount paid for ${escapeHtml(bill.name)}" style="width:100px">
      <input class="inline-input" type="date" value="${todayISO()}" aria-label="Date paid for ${escapeHtml(bill.name)}" style="width:150px">
      <button class="btn btn-primary btn-small" type="submit">Record payment</button>
    </form>`;
    return `<div class="bill-row">
      <input class="check" type="checkbox" data-bill="${bill.id}" ${paid ? 'checked' : ''} aria-label="Mark ${escapeHtml(bill.name)} as paid">
      <div class="bill-date"><b>${d}</b><span>${monthShort}</span></div>
      <div class="bill-main">
        <p><b>${escapeHtml(bill.name)}</b></p>
        <p class="sub"><span class="cat-dot" style="background:${cat.color}"></span>${cat.name} · ${bill.autopay ? 'Autopay — leaves the account by itself' : 'Manual — pay it from the provider’s site or app'}</p>
        ${lastPaymentHtml(bill)}
        ${payForm}
      </div>
      ${duePill(due, paid)}
      <b>${fmtMoney(bill.amount)}</b>
    </div>`;
  }).join('');

  const next = unpaid[0];
  const paymentLog = allBillPayments();
  const logRows = paymentLog.length ? paymentLog.slice(0, 10).map((entry) => {
    const bill = state.bills.find((b) => b.id === entry.billId);
    return `<div class="bill-row"><div class="bill-main"><p><b>${escapeHtml(bill ? bill.name : entry.billId)}</b></p><p class="sub">${fmtDay(entry.date)} · for ${escapeHtml(entry.month)}</p></div><b>${fmtMoney(entry.amount)}</b></div>`;
  }).join('') : '<p class="mini-note">No payments recorded yet — record one from a bill above and it will appear here with its date and amount.</p>';
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
  </div>
  <div class="card" style="margin-top:16px">
    <h2>Payment log</h2>
    <p class="sub">Every payment recorded on this page, newest first — the receipt book for the month's bills.</p>
    ${logRows}
    ${paymentLog.length > 10 ? `<p class="mini-note" style="margin-top:8px">Showing the newest ten of ${paymentLog.length} recorded payments.</p>` : ''}
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
  document.querySelectorAll('[data-pay-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputs = form.querySelectorAll('input');
      const amount = parseFloat(inputs[0].value) || 0;
      const paidOn = inputs[1] ? inputs[1].value : '';
      const receipt = recordBillPayment(form.dataset.payForm, monthKey, amount, paidOn);
      if (!receipt) return;
      toast('Recorded ' + fmtMoney(receipt.amount) + ' paid on ' + fmtDay(receipt.date));
      rerender(false);
    });
  });
}
