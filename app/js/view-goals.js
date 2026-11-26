// view-goals.js — the Goals page: what the household is saving towards, how far
// along each goal is, when it lands at the current monthly pace, and a working
// "add money" control on every goal that moves the ring, the bar and the date.

import { getState, recordGoalContribution, goalHistory, goalContributedTotal } from './store.js';
import { fmtMoney, fmtWhole, fmtDay, monthLabel, shiftMonth, pct, escapeHtml } from './money.js';
import { ringSVG } from './charts.js';
import { toast } from './forms.js';

const RING_COLORS = ['#2E7D5B', '#C4622D', '#D9A441', '#4A6FA5'];

function etaLabel(goal, monthKey) {
  const remaining = goal.target - goal.saved;
  if (remaining <= 0) return 'Fully funded — time to celebrate (and set the next one)';
  if (!goal.monthly) return 'No monthly amount set yet';
  const months = Math.ceil(remaining / goal.monthly);
  return `On pace for ${monthLabel(shiftMonth(monthKey, months))} at ${fmtWhole(goal.monthly)}/month`;
}

// The goal's own top-up ledger: the newest five entries, newest first, with
// the running total of everything added this way (the monthly automatic
// transfers are not itemised — only the top-ups made on this page).
function historyHtml(goal) {
  const entries = goalHistory(goal.id);
  const added = goalContributedTotal(goal.id);
  if (!entries.length) {
    return `<p class="mini-note" style="margin-top:12px">No extra top-ups yet — the first one you add here will appear in this list with its date.</p>`;
  }
  const rows = entries.slice(0, 5).map((entry) =>
    `<div class="bill-row"><div class="bill-main"><p>${escapeHtml(entry.note || 'Top-up')}</p><p class="sub">${fmtDay(entry.date)}</p></div><b class="pos">${fmtMoney(entry.amount)}</b></div>`).join('');
  return `<div style="margin-top:12px">
    <p class="sub">Recent top-ups — ${entries.length} in total, ${fmtMoney(added)} added this way</p>
    ${rows}
    ${entries.length > 5 ? `<p class="mini-note" style="margin-top:8px">Showing the newest five of ${entries.length} top-ups.</p>` : ''}
  </div>`;
}

export function renderGoals(monthKey) {
  const state = getState();
  const totalSaved = state.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = state.goals.reduce((s, g) => s + g.target, 0);
  const totalMonthly = state.goals.reduce((s, g) => s + g.monthly, 0);

  const cards = state.goals.map((g, i) => {
    const p = pct(g.saved, g.target);
    return `<div class="card">
      <div class="ring-wrap">
        ${ringSVG(p, RING_COLORS[i % RING_COLORS.length], 78, g.name + ' ' + p + '% funded')}
        <div class="ring-labels">
          <h2>${escapeHtml(g.name)}</h2>
          <p><b>${fmtMoney(g.saved)}</b> of ${fmtMoney(g.target)}</p>
          <p class="sub">${etaLabel(g, monthKey)}</p>
        </div>
      </div>
      <p style="margin:12px 0">${escapeHtml(g.note)}</p>
      <form class="toolbar" data-goal-form="${g.id}" style="margin:0">
        <input class="inline-input" type="number" min="0.01" step="0.01" placeholder="Add $" aria-label="Amount to add to ${escapeHtml(g.name)}" style="width:110px">
        <input class="inline-input" type="text" maxlength="60" placeholder="Note (optional)" aria-label="Note for this top-up to ${escapeHtml(g.name)}" style="flex:1;min-width:120px">
        <button class="btn btn-primary btn-small" type="submit">Add money</button>
      </form>
      ${historyHtml(g)}
    </div>`;
  }).join('');

  return `
  <div class="page-head">
    <h1>Savings goals</h1>
    <p>Four pots, one habit: ${fmtWhole(totalMonthly)} moves into savings every month before anything fun is bought. Add an extra contribution any time — the rings, totals and finish dates update on the spot.</p>
  </div>
  <div class="grid grid-3">
    <div class="card"><p class="stat-label">Saved so far</p><p class="stat-value pos">${fmtWhole(totalSaved)}</p><p class="stat-note">Across all four goals</p></div>
    <div class="card"><p class="stat-label">Combined target</p><p class="stat-value">${fmtWhole(totalTarget)}</p><p class="stat-note">${pct(totalSaved, totalTarget)}% of the way there</p></div>
    <div class="card"><p class="stat-label">Monthly pace</p><p class="stat-value">${fmtWhole(totalMonthly)}</p><p class="stat-note">Automatic, on payday</p></div>
  </div>
  <div class="grid grid-2" style="margin-top:16px">${cards}</div>`;
}

export function bindGoals(rerender) {
  document.querySelectorAll('[data-goal-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputs = form.querySelectorAll('input');
      const amount = parseFloat(inputs[0].value) || 0;
      if (amount <= 0) return;
      const note = inputs[1] ? inputs[1].value.trim() : '';
      const entry = recordGoalContribution(form.dataset.goalForm, amount, note);
      if (!entry) return;
      toast('Added ' + fmtMoney(amount) + ' to the goal');
      rerender(false);
    });
  });
}
