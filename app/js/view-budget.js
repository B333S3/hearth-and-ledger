// view-budget.js — the Budget page: one row per category with what was planned,
// what was spent, a bar that turns amber then red as the limit nears, and an
// inline editor for every limit. "Left per day" spreads what remains of each
// budget across the days left in the month.

import { getState, CATEGORIES, spentByCategory, totalBudget, monthSpent, setBudget } from './store.js';
import { fmtMoney, fmtWhole, daysInMonth, escapeHtml } from './money.js';
import { toast } from './forms.js';

export function renderBudget(monthKey) {
  const state = getState();
  const byCat = spentByCategory(monthKey);
  const totalSpent = monthSpent(monthKey);
  const totalPlan = totalBudget();
  const [y, m] = monthKey.split('-').map(Number);
  const today = new Date();
  const isCurrent = today.getFullYear() === y && today.getMonth() + 1 === m;
  const daysLeft = isCurrent ? daysInMonth(monthKey) - today.getDate() : 0;

  const rows = CATEGORIES.map((cat) => {
    const limit = state.budgets[cat.id] || 0;
    const spent = byCat[cat.id] || 0;
    const ratio = limit ? spent / limit : 0;
    const barClass = ratio > 1 ? 'over' : ratio > 0.85 ? 'near' : '';
    const status = ratio > 1
      ? `<span class="pill pill-bad">${fmtMoney(spent - limit)} over</span>`
      : ratio > 0.85
        ? `<span class="pill pill-warn">${fmtMoney(limit - spent)} left</span>`
        : `<span class="pill">${fmtMoney(limit - spent)} left</span>`;
    const perDay = isCurrent && daysLeft > 0 && limit - spent > 0
      ? `<span class="mini-note">≈ ${fmtMoney((limit - spent) / daysLeft)}/day</span>` : '';
    return `<tr>
      <td><span class="cat-dot" style="background:${cat.color}"></span><b>${cat.name}</b></td>
      <td style="min-width:150px"><div class="bar"><i class="${barClass}" style="width:${Math.min(100, ratio * 100)}%"></i></div></td>
      <td class="amount">${fmtMoney(spent)}</td>
      <td class="amount">${fmtMoney(limit)}</td>
      <td>${status} ${perDay}</td>
      <td class="row-actions"><button class="btn btn-small" data-adjust="${cat.id}" type="button">Adjust</button></td>
    </tr>
    <tr class="adjust-row" id="adjust-${cat.id}" hidden>
      <td colspan="6">
        <form class="toolbar" data-adjust-form="${cat.id}" style="margin:4px 0">
          <label for="limit-${cat.id}"><b>New monthly limit for ${cat.name} ($)</b></label>
          <input class="inline-input" id="limit-${cat.id}" type="number" min="0" step="1" value="${limit}" style="width:130px">
          <button class="btn btn-primary btn-small" type="submit">Save limit</button>
          <span class="mini-note">So far this month: ${fmtMoney(spent)}. The Overview and Insights pages use the new limit right away.</span>
        </form>
      </td>
    </tr>`;
  }).join('');

  return `
  <div class="page-head">
    <h1>The monthly budget</h1>
    <p>Planned vs actual for every part of household life. Limits are yours to change — tap Adjust on any row. ${isCurrent ? `There are ${daysLeft} days left in the month, so each row also shows what is left per day.` : 'This is a finished month, shown for the record.'}</p>
  </div>
  <div class="grid grid-3">
    <div class="card"><p class="stat-label">Planned</p><p class="stat-value">${fmtWhole(totalPlan)}</p><p class="stat-note">Across ${CATEGORIES.length} categories</p></div>
    <div class="card"><p class="stat-label">Spent so far</p><p class="stat-value">${fmtWhole(totalSpent)}</p><p class="stat-note">${totalPlan ? Math.round((totalSpent / totalPlan) * 100) : 0}% of the plan</p></div>
    <div class="card"><p class="stat-label">Still available</p><p class="stat-value ${totalPlan - totalSpent < 0 ? 'neg' : 'pos'}">${fmtWhole(totalPlan - totalSpent)}</p><p class="stat-note">${totalPlan - totalSpent >= 0 ? 'Room left in the plan' : 'Over plan — trim a category or two'}</p></div>
  </div>
  <div class="card" style="margin-top:16px">
    <table class="ledger">
      <thead><tr><th>Category</th><th>Progress</th><th class="amount">Spent</th><th class="amount">Limit</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="mini-note" style="margin-top:12px">How the Parkers set limits: last month's actual spending, rounded to a friendly number, plus a little slack in Groceries for guests and holidays. Dining Out is deliberately the tightest — it is the first place money leaks.</p>
  </div>`;
}

export function bindBudget() {
  document.querySelectorAll('[data-adjust]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = document.getElementById('adjust-' + btn.dataset.adjust);
      if (row) row.hidden = !row.hidden;
    });
  });
  document.querySelectorAll('[data-adjust-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = form.dataset.adjustForm;
      const input = form.querySelector('input[type=number]');
      const value = Math.max(0, parseFloat(input.value) || 0);
      setBudget(id, value);
      toast('Budget limit saved');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });
}
