// view-overview.js — the Overview page: where the household stands this month.
// Balances, money in and out, budget health, the spending donut, what's due next
// and the latest ledger entries — every number computed from the same store the
// other pages edit, so the picture can never disagree with itself.

import {
  getState, monthIncome, monthSpent, spentByCategory, totalBudget, netWorth,
  transactionsInMonth, billDueDate, billIsPaid, categoryById,
} from './store.js';
import { fmtMoney, fmtWhole, fmtSigned, fmtDay, pct, daysUntil, escapeHtml } from './money.js';
import { donutSVG, ringSVG } from './charts.js';
import { openTransactionModal } from './forms.js';

export function renderOverview(monthKey) {
  const state = getState();
  const income = monthIncome(monthKey);
  const spent = monthSpent(monthKey);
  const budget = totalBudget();
  const byCat = spentByCategory(monthKey);
  const left = income - spent;
  const healthPct = budget ? (spent / budget) * 100 : 0;

  const segments = Object.entries(byCat)
    .map(([id, value]) => ({ label: categoryById(id).name, value, color: categoryById(id).color }))
    .sort((a, b) => b.value - a.value);
  const legend = segments.slice(0, 6).map((s) =>
    `<span><span class="cat-dot" style="background:${s.color}"></span>${s.label} · ${fmtWhole(s.value)}</span>`).join('');

  const upcoming = state.bills
    .map((b) => ({ bill: b, due: billDueDate(b, monthKey), paid: billIsPaid(b, monthKey) }))
    .filter((x) => !x.paid)
    .sort((a, b) => (a.due < b.due ? -1 : 1))
    .slice(0, 3);
  const upcomingHtml = upcoming.length ? upcoming.map(({ bill, due }) => {
    const d = daysUntil(due);
    const when = d < 0 ? `<span class="pill pill-bad">${-d}d overdue</span>`
      : d === 0 ? '<span class="pill pill-warn">Due today</span>'
      : d <= 3 ? `<span class="pill pill-warn">Due in ${d}d</span>`
      : `<span class="pill pill-plain">${fmtDay(due)}</span>`;
    return `<div class="bill-row">
      <div class="bill-main"><p><b>${escapeHtml(bill.name)}</b></p><p class="sub">${bill.autopay ? 'Autopay is on' : 'Needs a manual payment'}</p></div>
      ${when}<b>${fmtMoney(bill.amount)}</b></div>`;
  }).join('') : '<p class="mini-note">Every bill for this month is settled. Nicely done.</p>';

  const recent = transactionsInMonth(monthKey).slice(0, 5).map((t) => {
    const cat = categoryById(t.category);
    return `<tr><td>${fmtDay(t.date)}</td><td>${escapeHtml(t.payee)}</td>
      <td><span class="cat-dot" style="background:${cat.color}"></span>${cat.name}</td>
      <td class="amount ${t.amount > 0 ? 'pos' : ''}">${fmtSigned(t.amount)}</td></tr>`;
  }).join('');

  const goal = state.goals[0] || { saved: 0, target: 1 };
  const goalPct = pct(goal.saved, goal.target);

  return `
  <div class="page-head">
    <h1>Good ${dayPart()}, Emma &amp; Josh</h1>
    <p>Here is the Parker household money picture for this month — balances, budgets, bills and goals, all in one place.</p>
  </div>

  <div class="grid grid-4">
    <div class="card"><p class="stat-label">Money in</p><p class="stat-value pos">${fmtWhole(income)}</p><p class="stat-note">Salaries, tutoring and interest</p></div>
    <div class="card"><p class="stat-label">Money out</p><p class="stat-value">${fmtWhole(spent)}</p><p class="stat-note">Across ${transactionsInMonth(monthKey).filter((t) => t.amount < 0).length} purchases and bills</p></div>
    <div class="card"><p class="stat-label">Left this month</p><p class="stat-value ${left < 0 ? 'neg' : ''}">${fmtWhole(left)}</p><p class="stat-note">${left >= 0 ? 'On pace — keep it rolling into savings' : 'Over income — check the Budget page'}</p></div>
    <div class="card"><p class="stat-label">Net worth</p><p class="stat-value">${fmtWhole(netWorth())}</p><p class="stat-note">All accounts, after the credit card</p></div>
  </div>

  <div class="grid grid-2" style="margin-top:16px">
    <div class="card">
      <h2>Budget health</h2>
      <p class="sub">Spending against the month's planned budget of ${fmtWhole(budget)}</p>
      <div class="ring-wrap">
        ${ringSVG(healthPct, healthPct > 100 ? '#B3402A' : healthPct > 85 ? '#D9A441' : '#2E7D5B', 84)}
        <div class="ring-labels">
          <p><b>${fmtMoney(spent)}</b> spent of ${fmtMoney(budget)}</p>
          <p class="sub">${budget - spent >= 0 ? fmtMoney(budget - spent) + ' of planned room left' : fmtMoney(spent - budget) + ' over plan — the Budget page shows where'}</p>
          <a href="#/budget">Open the full budget →</a>
        </div>
      </div>
      <h3 style="margin-top:16px">Accounts</h3>
      ${state.accounts.map((a) => `<div class="bill-row"><div class="bill-main"><p>${escapeHtml(a.name)}</p></div><b class="${a.balance < 0 ? 'neg' : ''}">${fmtMoney(a.balance)}</b></div>`).join('')}
    </div>

    <div class="card">
      <h2>Where the money went</h2>
      <p class="sub">Spending by category, this month</p>
      ${donutSVG(segments, 'Spent', fmtWhole(spent))}
      <div class="legend">${legend}</div>
      <p style="margin-top:10px"><a href="#/insights">See the full breakdown →</a></p>
    </div>
  </div>

  <div class="grid grid-2" style="margin-top:16px">
    <div class="card">
      <h2>Coming due</h2>
      <p class="sub">Unpaid bills for this month, soonest first</p>
      ${upcomingHtml}
      <p style="margin-top:8px"><a href="#/bills">All bills and due dates →</a></p>
    </div>
    <div class="card">
      <h2>Latest activity</h2>
      <p class="sub">The five newest entries in the ledger</p>
      <table class="ledger"><tbody>${recent}</tbody></table>
      <p style="margin-top:8px"><a href="#/transactions">Open the ledger →</a> &nbsp;·&nbsp; <a href="#/goals">Emergency fund is ${goalPct}% funded →</a></p>
      <button class="btn btn-primary" id="overview-add" type="button">+ Add a transaction</button>
    </div>
  </div>`;
}

function dayPart() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function bindOverview() {
  const btn = document.getElementById('overview-add');
  if (btn) btn.addEventListener('click', () => openTransactionModal());
}
