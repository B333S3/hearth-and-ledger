// data-tools.js — taking the household's figures out of the browser and putting
// them back: export the whole ledger as one JSON file, import a file exported
// earlier, and reset everything to the opening figures. Nothing here touches
// the network; the file never leaves the household's own device.

import { getState, replaceState, resetAll } from './store.js';
import { toast } from './forms.js';
import { todayISO } from './money.js';

const EXPORT_VERSION = 1;

function triggerDownload(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function snapshotForExport() {
  const household = getState();
  return {
    app: 'hearth-and-ledger',
    version: EXPORT_VERSION,
    exportedAt: todayISO(),
    household: household.household,
    members: household.members,
    accounts: household.accounts,
    budgets: household.budgets,
    monthlySummary: household.monthlySummary,
    transactions: household.transactions,
    bills: household.bills,
    goals: household.goals,
    billPayments: household.billPayments || [],
  };
}

export function exportLedgerJSON() {
  const payload = JSON.stringify(snapshotForExport(), null, 2);
  triggerDownload('hearth-ledger-export-' + todayISO() + '.json', payload);
  toast('Exported ' + getState().transactions.length + ' transactions as JSON');
}

// A file is only trusted as an import when it carries the app marker, the
// version this build writes, and every collection the views read. Anything
// else is refused with a plain-language reason, never half-applied.
export function isValidSnapshot(value) {
  if (!value || typeof value !== 'object') return 'That file is not a Hearth & Ledger export.';
  if (value.app !== 'hearth-and-ledger') return 'That file was not exported by Hearth & Ledger.';
  if (value.version !== EXPORT_VERSION) return 'That export is from a different version of the site.';
  if (!Array.isArray(value.transactions)) return 'The export is missing its transactions.';
  if (!Array.isArray(value.bills)) return 'The export is missing its bills.';
  if (!Array.isArray(value.goals)) return 'The export is missing its savings goals.';
  if (!Array.isArray(value.accounts)) return 'The export is missing its accounts.';
  if (!value.transactions.every((entry) =>
    entry && typeof entry.id === 'string' && typeof entry.date === 'string' && Number.isFinite(entry.amount))) {
    return 'Some transactions in the export are missing an id, a date or an amount.';
  }
  if (!value.bills.every((bill) =>
    bill && typeof bill.id === 'string' && Array.isArray(bill.paidMonths))) {
    return 'Some bills in the export are missing an id or their paid-months list.';
  }
  if (!value.goals.every((goal) =>
    goal && typeof goal.id === 'string' && Number.isFinite(goal.saved) && Number.isFinite(goal.target))) {
    return 'Some savings goals in the export are missing an id or their amounts.';
  }
  return null;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsText(file);
  });
}

export async function importLedgerFile(file, rerender) {
  let text;
  try {
    text = await readFileAsText(file);
  } catch {
    toast('That file could not be read — try exporting again first.');
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    toast('That file is not valid JSON — it cannot be imported.');
    return;
  }
  const problem = isValidSnapshot(parsed);
  if (problem) {
    toast(problem);
    return;
  }
  const imported = replaceState(parsed);
  if (!imported) {
    toast('The import was refused: the file failed the safety check.');
    return;
  }
  toast('Imported ' + parsed.transactions.length + ' transactions, ' + parsed.bills.length + ' bills and ' + parsed.goals.length + ' goals');
  rerender(false);
}

export function resetLedgerData(rerender) {
  const confirmed = window.confirm(
    'Reset everything to the opening figures? Every transaction, bill tick and goal top-up added since will be gone. ' +
    'Export a JSON copy first if you want to keep this version.',
  );
  if (!confirmed) return;
  resetAll();
  toast('Back to the opening figures');
  rerender(false);
}

// The three buttons and the hidden file picker live on the Transactions page,
// so the export and import controls sit next to the ledger they act on.
export function bindDataTools(rerender) {
  const exportBtn = document.getElementById('data-export');
  if (exportBtn) exportBtn.addEventListener('click', () => exportLedgerJSON());
  const importBtn = document.getElementById('data-import-btn');
  const picker = document.getElementById('data-import-file');
  if (importBtn && picker) {
    importBtn.addEventListener('click', () => picker.click());
    picker.addEventListener('change', () => {
      const file = picker.files && picker.files[0];
      picker.value = '';
      if (file) importLedgerFile(file, rerender);
    });
  }
  const resetBtn = document.getElementById('data-reset');
  if (resetBtn) resetBtn.addEventListener('click', () => resetLedgerData(rerender));
}
