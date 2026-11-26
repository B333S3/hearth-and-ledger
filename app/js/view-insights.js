// view-insights.js — the Insights page: six months of cash flow, this month vs
// last month by category, the household's savings rate, its biggest payees, and
// plain-language notes that turn the numbers into decisions. Every figure is
// computed from the ledger, so editing a transaction rewrites the story here.

import {
  CATEGORIES, sixMonthTrend, spentByCategory, monthIncome, monthSpent,
  transactionsInMonth, categoryById, getState,
} from './store.js';
import { fmtMoney, fmtWhole, fmtSigned, monthLabel, pct, escapeHtml } from './money.js';
import { cashFlowSVG, compareBar } from './charts.js';

export function renderInsights(monthKey) {
  const trend = sixMonthTrend().map((r) => ({ ...r, label: monthLabel(r.month).slice(0, 3) }));
  const prevKey = monthKey === '2026-11' ? '2026-10' : '2026-11';
  const thisByCat = spentByCategory(monthKey);
  const prevByCat = spentByCategory(prevKey);
  const income = monthIncome(monthKey);
  const spent = monthSpent(monthKey);
  const savingsRate = income ? Math.round(((income - spent) / income) * 100) : 0;
  const kept = trend.reduce((s, r) => s + (r.income - r.spent), 0);

  const compareRows = CATEGORIES.map((cat) => {
    const now = thisByCat[cat.id] || 0;
    const before = prevByCat[cat.id] || 0;
    const diff = now - before;
    const max = Math.max(...CATEGORIES.map((c) => Math.max(thisByCat[c.id] || 0, prevByCat[c.id] || 0)));
    return `<tr>
      <td><span class="cat-dot" style="background:${cat.color}"></span>${cat.name}</td>
      <td>${compareBar(now, max, cat.color)}</td>
      <td class="amount">${fmtMoney(now)}</td>
      <td class="amount">${fmtMoney(before)}</td>
      <td class="amount ${diff > 0 ? 'neg' : 'pos'}">${diff === 0 ? '—' : fmtSigned(-diff)}</td>
    </tr>`;
  }).join('');

  const payees = {};
  for (const t of transactionsInMonth(monthKey)) {
    if (t.amount < 0 && t.category !== 'other') payees[t.payee] = (payees[t.payee] || 0) - t.amount;
  }
  const topPayees = Object.entries(payees).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topPayeeHtml = topPayees.map(([name, v], i) =>
    `<div class="bill-row"><b style="width:22px">${i + 1}</b><div class="bill-main"><p>${escapeHtml(name)}</p></div><b>${fmtMoney(v)}</b></div>`).join('');

  const diningNow = thisByCat.dining || 0, diningBefore = prevByCat.dining || 0;
  const groceryNow = thisByCat.groceries || 0;
  const funNow = (thisByCat.fun || 0);
  // The Christmas tip reads the live goal, not a hardcoded percentage, so it
  // stays true when the household tops the goal up.
  const christmasGoal = getState().goals.find((g) => g.id === 'g3') || { saved: 0, target: 1 };

  return `
  <div class="page-head">
    <h1>Insights</h1>
    <p>The story behind the numbers: how this month compares with last, where the money concentrates, and what the Parkers are doing about it.</p>
  </div>

  <div class="grid grid-3">
    <div class="card"><p class="stat-label">Savings rate this month</p><p class="stat-value ${savingsRate < 0 ? 'neg' : 'pos'}">${savingsRate}%</p><p class="stat-note">Share of income not spent — the household aims for 20%</p></div>
    <div class="card"><p class="stat-label">Kept over six months</p><p class="stat-value pos">${fmtWhole(kept)}</p><p class="stat-note">Income minus spending, June to now</p></div>
    <div class="card"><p class="stat-label">Biggest category</p><p class="stat-value" style="font-size:23px">${escapeHtml(categoryById(Object.entries(thisByCat).sort((a, b) => b[1] - a[1])[0]?.[0] || 'housing').name)}</p><p class="stat-note">${fmtWhole(Math.max(0, ...Object.values(thisByCat)))} — rent is fixed, so groceries are the real lever</p></div>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>Income vs spending — last six months</h2>
    <p class="sub">Sage is money in, terracotta is money out. The gap between each pair is what the household kept.</p>
    ${cashFlowSVG(trend, fmtWhole)}
    <div class="legend"><span><span class="cat-dot" style="background:#2E7D5B"></span>Income</span><span><span class="cat-dot" style="background:#C4622D"></span>Spending</span></div>
  </div>

  <div class="grid grid-2" style="margin-top:16px">
    <div class="card">
      <h2>This month vs ${monthLabel(prevKey).split(' ')[0]}</h2>
      <p class="sub">By category — green means less spent than last month</p>
      <table class="ledger">
        <thead><tr><th>Category</th><th></th><th class="amount">Now</th><th class="amount">Before</th><th class="amount">Change</th></tr></thead>
        <tbody>${compareRows}</tbody>
      </table>
    </div>
    <div class="card">
      <h2>Where it concentrates</h2>
      <p class="sub">The five biggest payees this month (savings transfer excluded)</p>
      ${topPayeeHtml}
      <h2 style="margin-top:18px">Notes from the numbers</h2>
      <div class="tip"><span class="tip-ico">🍽</span><p><b>Dining is the leak to watch.</b> Eating out is at ${fmtMoney(diningNow)} against ${fmtMoney(diningBefore)} last month, with four days still to go. One home-cooked weekend brings it back inside the ${fmtMoney(240)} limit.</p></div>
      <div class="tip"><span class="tip-ico">🛒</span><p><b>Groceries are holding steady</b> at ${fmtMoney(groceryNow)} — the two-part Thanksgiving shop is inside the usual weekly pattern, not on top of it. The list-first rule is working.</p></div>
      <div class="tip"><span class="tip-ico">▶</span><p><b>Three streaming bills, one household.</b> Fun &amp; Streaming totals ${fmtMoney(funNow)} this month across Netflix, Hulu and Spotify. Rotating one service off per quarter would free about ${fmtMoney(180)} a year for the road-trip fund.</p></div>
      <div class="tip"><span class="tip-ico">🎄</span><p><b>Christmas is ${pct(christmasGoal.saved, christmasGoal.target)}% funded</b> with the December top-up still to come — the first year the Parkers will not meet January with a card balance from December.</p></div>
    </div>
  </div>`;
}
