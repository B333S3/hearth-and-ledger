// app.js — the shell: hash routing between the six sections, the month switcher
// (October and November 2026, the two months with full ledgers), the top-bar
// Add button, and the re-render that keeps every page in agreement after an edit.

import { monthLabel } from './money.js';
import { setSavedHandler, openTransactionModal } from './forms.js';
import { renderOverview, bindOverview } from './view-overview.js';
import { renderBudget, bindBudget } from './view-budget.js';
import { renderTransactions, bindTransactions } from './view-transactions.js';
import { renderBills, bindBills } from './view-bills.js';
import { renderGoals, bindGoals } from './view-goals.js';
import { renderInsights } from './view-insights.js';
import { renderYear } from './view-year.js';

const MONTHS = ['2026-10', '2026-11'];
let currentMonth = '2026-11';

const ROUTES = {
  overview: { render: renderOverview, bind: () => bindOverview() },
  budget: { render: renderBudget, bind: () => bindBudget() },
  transactions: { render: renderTransactions, bind: (rerender) => bindTransactions(rerender) },
  bills: { render: renderBills, bind: (rerender) => bindBills(currentMonth, rerender) },
  goals: { render: renderGoals, bind: (rerender) => bindGoals(currentMonth, rerender) },
  insights: { render: renderInsights, bind: () => {} },
  // The year in review is a sub-page of Insights, reached only from the link
  // at the bottom of that page: it has no side-navigation entry, so the
  // six-item menu stays as photographed.
  year: { render: renderYear, bind: () => {} },
};

function routeName() {
  const name = location.hash.replace('#/', '').split('/')[0];
  return ROUTES[name] ? name : 'overview';
}

function render(moveFocus = true) {
  const name = routeName();
  document.title = 'Hearth & Ledger — ' + name[0].toUpperCase() + name.slice(1);
  const view = document.getElementById('view');
  view.innerHTML = ROUTES[name].render(currentMonth);
  ROUTES[name].bind(() => render(false));
  document.querySelectorAll('[data-route]').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === name);
  });
  document.getElementById('month-label').textContent = monthLabel(currentMonth);
  document.getElementById('month-prev').disabled = currentMonth === MONTHS[0];
  document.getElementById('month-next').disabled = currentMonth === MONTHS[MONTHS.length - 1];
  if (moveFocus) view.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

document.getElementById('month-prev').addEventListener('click', () => {
  const i = MONTHS.indexOf(currentMonth);
  if (i > 0) { currentMonth = MONTHS[i - 1]; render(false); }
});
document.getElementById('month-next').addEventListener('click', () => {
  const i = MONTHS.indexOf(currentMonth);
  if (i < MONTHS.length - 1) { currentMonth = MONTHS[i + 1]; render(false); }
});
document.getElementById('add-transaction-top').addEventListener('click', () => openTransactionModal());

// After the modal saves, jump the month switcher to the month the entry landed
// in (when it is one of the two ledger months) and repaint.
setSavedHandler((dateIso) => {
  const key = dateIso.slice(0, 7);
  if (MONTHS.includes(key)) currentMonth = key;
  render(false);
});

window.addEventListener('hashchange', () => render());
render();
