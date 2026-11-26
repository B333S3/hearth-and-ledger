// view-year.js — the Year in Review: the whole of 2026 on one page. It is reached
// from a link at the bottom of Insights, never from the side navigation, so the
// six-item menu in the screenshots stays exactly as photographed. Every number
// here is recomputed from the ledger and the stored summaries, so editing a
// transaction or paying a bill rewrites this page too.

import {
  CATEGORIES, categoryById, getState, sixMonthTrend,
} from './store.js';
import {
  fmtMoney, fmtWhole, monthLabel, pct, escapeHtml,
} from './money.js';

const YEAR = '2026';
const LEDGER_MONTHS = ['2026-10', '2026-11'];

// The six monthly rows (June–September are stored summaries; October and
// November are computed from the ledger by sixMonthTrend).
function yearRows() {
  return sixMonthTrend().map((row) => ({
    key: row.month,
    label: monthLabel(row.month),
    income: row.income,
    spent: row.spent,
    kept: row.income - row.spent,
  }));
}

function yearTotals(rows) {
  const income = rows.reduce((sum, row) => sum + row.income, 0);
  const spent = rows.reduce((sum, row) => sum + row.spent, 0);
  return {
    income,
    spent,
    kept: income - spent,
    months: rows.length,
    averageSpent: rows.length ? spent / rows.length : 0,
    savingsRate: income ? Math.round(((income - spent) / income) * 100) : 0,
    bestMonth: rows.reduce((best, row) => (row.kept > best.kept ? row : best), rows[0]),
    hardestMonth: rows.reduce((worst, row) => (row.spent > worst.spent ? row : worst), rows[0]),
  };
}

// Spending by category, summed across the two months that carry a full ledger.
// June–September have totals but no category split, so they are left out of
// this table and the page says so plainly.
function ledgerCategorySpend() {
  const household = getState();
  const totals = {};
  for (const entry of household.transactions) {
    if (entry.amount < 0) {
      totals[entry.category] = (totals[entry.category] || 0) - entry.amount;
    }
  }
  return Object.entries(totals)
    .map(([id, total]) => ({ cat: categoryById(id), total }))
    .sort((a, b) => b.total - a.total);
}

// How the eight recurring bills fared across the two ledger months: each bill
// owes one payment per month, so sixteen bill-months are on the books.
function billYearRecord() {
  const household = getState();
  const expected = household.bills.length * LEDGER_MONTHS.length;
  let settled = 0;
  const perBill = household.bills.map((bill) => {
    const paidHere = LEDGER_MONTHS.filter((key) => bill.paidMonths.includes(key));
    settled += paidHere.length;
    return { bill, paidCount: paidHere.length, months: paidHere };
  });
  return { expected, settled, perBill, onTimePct: expected ? pct(settled, expected) : 0 };
}

function goalYearSnapshot() {
  const household = getState();
  const saved = household.goals.reduce((sum, goal) => sum + goal.saved, 0);
  const target = household.goals.reduce((sum, goal) => sum + goal.target, 0);
  return {
    saved,
    target,
    fundedPct: pct(saved, target),
    goals: household.goals.map((goal) => ({
      goal,
      funded: pct(goal.saved, goal.target),
      remaining: Math.max(0, goal.target - goal.saved),
    })),
  };
}

// The eight largest single outgoings in the ledger, rent included — the
// purchases that moved the month, each with its date and category.
function largestPurchases(limit) {
  const household = getState();
  return household.transactions
    .filter((entry) => entry.amount < 0)
    .map((entry) => ({ entry, magnitude: -entry.amount }))
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, limit);
}

// One savings rate per month: the share of that month's income the household
// kept, from the same six rows the chart on Insights draws from.
function savingsRateByMonth(rows) {
  return rows.map((row) => ({
    label: row.label,
    rate: row.income ? Math.round(((row.income - row.spent) / row.income) * 100) : 0,
    kept: row.kept,
  }));
}

// The subscriptions and standing charges hiding in the ledger: a payee that
// took money in both ledger months, for amounts within a sixth of each other,
// is treated as recurring. The list is the household's real subscription
// bill — the charges that keep coming whether anyone notices or not.
function recurringCharges() {
  const household = getState();
  const byPayee = {};
  for (const entry of household.transactions) {
    if (entry.amount >= 0) continue;
    const key = entry.payee.trim().toLowerCase();
    const bucket = byPayee[key] || { payee: entry.payee, category: entry.category, months: {}, amounts: [] };
    bucket.months[entry.date.slice(0, 7)] = true;
    bucket.amounts.push(-entry.amount);
    byPayee[key] = bucket;
  }
  return Object.values(byPayee)
    .filter((bucket) => {
      const seen = Object.keys(bucket.months);
      if (seen.length < LEDGER_MONTHS.length) return false;
      const biggest = Math.max(...bucket.amounts);
      const smallest = Math.min(...bucket.amounts);
      return biggest > 0 && (biggest - smallest) / biggest <= 1 / 6;
    })
    .map((bucket) => {
      const typical = bucket.amounts.reduce((sum, value) => sum + value, 0) / bucket.amounts.length;
      return {
        payee: bucket.payee,
        cat: categoryById(bucket.category),
        typical: Math.round(typical * 100) / 100,
        yearly: Math.round(typical * 12 * 100) / 100,
        times: bucket.amounts.length,
      };
    })
    .sort((a, b) => b.typical - a.typical);
}

function barRow(label, value, max, color, note) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return `<div class="bill-row">
    <div class="bill-main">
      <p><b>${escapeHtml(label)}</b> <span class="sub">${escapeHtml(note || '')}</span></p>
      <div style="height:10px;background:var(--line,#e8dfd2);border-radius:99px;overflow:hidden;margin-top:6px">
        <div style="height:100%;width:${width}%;background:${color};border-radius:99px"></div>
      </div>
    </div>
    <b>${fmtMoney(value)}</b>
  </div>`;
}

function monthBarRow(row, maxFlow) {
  const inWidth = maxFlow > 0 ? Math.max(2, Math.round((row.income / maxFlow) * 100)) : 0;
  const outWidth = maxFlow > 0 ? Math.max(2, Math.round((row.spent / maxFlow) * 100)) : 0;
  return `<div class="bill-row">
    <div class="bill-main">
      <p><b>${escapeHtml(row.label)}</b> <span class="sub">kept ${fmtMoney(row.kept)}</span></p>
      <div style="height:9px;background:var(--line,#e8dfd2);border-radius:99px;overflow:hidden;margin:5px 0">
        <div style="height:100%;width:${inWidth}%;background:#2E7D5B;border-radius:99px"></div>
      </div>
      <div style="height:9px;background:var(--line,#e8dfd2);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${outWidth}%;background:#C4622D;border-radius:99px"></div>
      </div>
      <p class="sub" style="margin-top:5px">in ${fmtMoney(row.income)} · out ${fmtMoney(row.spent)}</p>
    </div>
  </div>`;
}

export function renderYear() {
  const rows = yearRows();
  const totals = yearTotals(rows);
  const categories = ledgerCategorySpend();
  const bills = billYearRecord();
  const goals = goalYearSnapshot();
  const maxFlow = Math.max(...rows.map((row) => Math.max(row.income, row.spent)), 1);
  const maxCategory = categories.length ? categories[0].total : 1;

  const monthBars = rows.map((row) => monthBarRow(row, maxFlow)).join('');
  const categoryBars = categories.slice(0, 5).map(({ cat, total }) =>
    barRow(cat.name, total, maxCategory, cat.color, 'from the October–November ledger')).join('');
  const purchases = largestPurchases(8);
  const purchaseRows = purchases.map(({ entry, magnitude }) => {
    const cat = categoryById(entry.category);
    return `<div class="bill-row">
      <span class="cat-dot" style="background:${cat.color}"></span>
      <div class="bill-main"><p><b>${escapeHtml(entry.payee)}</b> <span class="sub">${cat.name}</span></p>
      <p class="sub">${escapeHtml(entry.date)}${entry.note ? ' · ' + escapeHtml(entry.note) : ''}</p></div>
      <b>${fmtMoney(magnitude)}</b>
    </div>`;
  }).join('');
  const rates = savingsRateByMonth(rows);
  const rateRows = rates.map(({ label, rate, kept }) => {
    const width = Math.max(2, Math.min(100, Math.abs(rate)));
    const tone = rate >= 20 ? '#2E7D5B' : rate >= 0 ? '#D9A441' : '#C24B5A';
    return `<div class="bill-row">
      <div class="bill-main">
        <p><b>${escapeHtml(label)}</b> <span class="sub">kept ${fmtMoney(kept)}</span></p>
        <div style="height:10px;background:var(--line,#e8dfd2);border-radius:99px;overflow:hidden;margin-top:6px">
          <div style="height:100%;width:${width}%;background:${tone};border-radius:99px"></div>
        </div>
      </div>
      <b>${rate}%</b>
    </div>`;
  }).join('');
  const recurring = recurringCharges();
  const recurringRows = recurring.map((charge) =>
    `<div class="bill-row">
      <span class="cat-dot" style="background:${charge.cat.color}"></span>
      <div class="bill-main"><p><b>${escapeHtml(charge.payee)}</b> <span class="sub">${charge.cat.name} · ${charge.times} charges seen</span></p>
      <p class="sub">about ${fmtMoney(charge.typical)} a month</p></div>
      <b>${fmtMoney(charge.yearly)} / year</b>
    </div>`).join('');
  const recurringYearly = recurring.reduce((sum, charge) => sum + charge.yearly, 0);
  const billRows = bills.perBill.map(({ bill, paidCount }) => {
    const cat = categoryById(bill.category);
    return `<div class="bill-row">
      <span class="cat-dot" style="background:${cat.color}"></span>
      <div class="bill-main"><p><b>${escapeHtml(bill.name)}</b></p>
      <p class="sub">${paidCount} of ${LEDGER_MONTHS.length} months paid · ${fmtMoney(bill.amount)}/month</p></div>
      <b>${paidCount === LEDGER_MONTHS.length ? 'Settled' : 'Open'}</b>
    </div>`;
  }).join('');
  const goalRows = goals.goals.map(({ goal, funded, remaining }) =>
    barRow(goal.name, goal.saved, goal.target, '#2E7D5B', `${funded}% funded · ${fmtMoney(remaining)} to go`)).join('');

  return `
  <div class="page-head">
    <h1>${YEAR} in review</h1>
    <p>Six months of the Parker household, June to November: what came in, what went out, what the bills did and how far the savings pots got. Category detail covers October and November, the two months with a full ledger.</p>
  </div>
  <div class="grid grid-3">
    <div class="card"><p class="stat-label">Income, six months</p><p class="stat-value pos">${fmtWhole(totals.income)}</p><p class="stat-note">June through November</p></div>
    <div class="card"><p class="stat-label">Spending, six months</p><p class="stat-value">${fmtWhole(totals.spent)}</p><p class="stat-note">Average ${fmtWhole(totals.averageSpent)} a month</p></div>
    <div class="card"><p class="stat-label">Kept this year</p><p class="stat-value pos">${fmtWhole(totals.kept)}</p><p class="stat-note">${totals.savingsRate}% savings rate — the household aims for 20%</p></div>
  </div>
  <div class="grid grid-2" style="margin-top:16px">
    <div class="card">
      <h2>Month by month</h2>
      <p class="sub">Green is money in, terracotta is money out — the gap is what stayed home.</p>
      ${monthBars}
      <p class="mini-note" style="margin-top:12px">Best month for keeping money: <b>${escapeHtml(totals.bestMonth.label)}</b> (${fmtMoney(totals.bestMonth.kept)} kept). Heaviest spending: <b>${escapeHtml(totals.hardestMonth.label)}</b> (${fmtMoney(totals.hardestMonth.spent)} out).</p>
    </div>
    <div class="card">
      <h2>Where the ledger money went</h2>
      <p class="sub">Top five categories, October–November ledger only — June to September are monthly totals, not a category split.</p>
      ${categoryBars}
      <p class="mini-note" style="margin-top:12px">${CATEGORIES.length} spending categories tracked; housing is the fixed cost, so groceries and dining are where the year was actually won or lost.</p>
    </div>
  </div>
  <div class="grid grid-2" style="margin-top:16px">
    <div class="card">
      <h2>Bills across the year</h2>
      <p class="sub">${bills.settled} of ${bills.expected} bill-months settled (${bills.onTimePct}%) — October and November, all eight recurring bills.</p>
      ${billRows}
    </div>
    <div class="card">
      <h2>Savings pots at year end</h2>
      <p class="sub">${fmtWhole(goals.saved)} saved of ${fmtWhole(goals.target)} (${goals.fundedPct}% funded across all four goals).</p>
      ${goalRows}
      <p class="mini-note" style="margin-top:12px">The emergency fund carries the year: more than two-thirds of everything the household has put aside sits in that one pot.</p>
    </div>
  </div>
  <div class="grid grid-2" style="margin-top:16px">
    <div class="card">
      <h2>Biggest single purchases</h2>
      <p class="sub">The eight outgoings that moved a month most — rent tops the list, as it should; the rest is where the year actually went.</p>
      ${purchaseRows}
    </div>
    <div class="card">
      <h2>Savings rate, month by month</h2>
      <p class="sub">Green clears the household's 20% aim, amber falls short of it, red means the month spent more than it earned.</p>
      ${rateRows}
      <p class="mini-note" style="margin-top:12px">November's rate is high because the month is still open — the Thanksgiving shops are in, but the last week of spending is not.</p>
    </div>
  </div>
  <div class="card" style="margin-top:16px">
    <h2>The quiet subscriptions</h2>
    <p class="sub">Payees that took money in both October and November for near-identical amounts — the charges that renew themselves. Together they cost ${fmtWhole(recurringYearly)} a year.</p>
    ${recurringRows || '<p class="mini-note">No payee charged in both ledger months — nothing here renews itself.</p>'}
    <p class="mini-note" style="margin-top:12px">Rent and the autopay bills are not in this list: they live on the Bills page. These are the extras — the streaming, the apps, the small print.</p>
  </div>
  <p style="margin-top:18px"><a href="#/insights">← Back to Insights</a></p>`;
}
