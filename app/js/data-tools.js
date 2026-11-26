// data-tools.js — taking the household's figures out of the browser and putting
// them back: export the whole ledger as one JSON file, import a file exported
// earlier, and reset everything to the opening figures. Nothing here touches
// the network; the file never leaves the household's own device.

import { getState, replaceState, resetAll, addTransaction, categoryById } from './store.js';
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

// A single CSV field: wrapped in quotes when it holds a comma, a quote or a
// line break, with inner quotes doubled — the shape a spreadsheet expects.
export function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) return '"' + text.replaceAll('"', '""') + '"';
  return text;
}

export function transactionsToCSV(rows) {
  const header = ['date', 'payee', 'category', 'amount', 'account', 'note'];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push([
      csvEscape(row.date),
      csvEscape(row.payee),
      csvEscape(row.category),
      csvEscape(Number(row.amount).toFixed(2)),
      csvEscape(row.account),
      csvEscape(row.note || ''),
    ].join(','));
  }
  return lines.join('\n') + '\n';
}

// The whole ledger as a spreadsheet-ready CSV: every transaction, oldest
// first, so the household can sort, filter and chart it anywhere.
export function exportLedgerCSV() {
  const household = getState();
  const ordered = [...household.transactions].sort((a, b) => (a.date < b.date ? -1 : 1));
  triggerDownload('hearth-ledger-transactions-' + todayISO() + '.csv', transactionsToCSV(ordered));
  toast('Exported ' + ordered.length + ' transactions as CSV');
}

// A small CSV reader: splits a file into rows of fields, honouring quoted
// fields that hold commas, doubled quotes or line breaks inside them.
// Returns null when a quote is left open — the file is not a well-formed CSV.
export function parseCSV(text) {
  const rows = [];
  let fields = [];
  let current = '';
  let quoted = false;
  let i = 0;
  const pushField = () => { fields.push(current); current = ''; };
  const pushRow = () => { pushField(); rows.push(fields); fields = []; };
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { current += '"'; i += 2; continue; }
        quoted = false;
        i += 1;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }
    if (ch === '"') { quoted = true; i += 1; continue; }
    if (ch === ',') { pushField(); i += 1; continue; }
    if (ch === '\n') { pushRow(); i += 1; continue; }
    if (ch === '\r') { i += 1; continue; }
    current += ch;
    i += 1;
  }
  if (quoted) return null;
  if (current !== '' || fields.length > 0) pushRow();
  return rows.filter((row) => row.some((field) => field.trim() !== ''));
}

// Turn CSV rows into ledger entries. The first row must be the header the
// export writes (date,payee,category,amount,account,note); every later row
// needs a real date and a finite amount, and its category must be one the
// household tracks — anything else is refused with the row number.
export function csvRowsToTransactions(rows) {
  if (!rows || rows.length < 2) return { error: 'The CSV has no transactions under its header row.' };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const wanted = ['date', 'payee', 'category', 'amount', 'account', 'note'];
  if (header.join(',') !== wanted.join(',')) {
    return { error: 'The CSV header should be: ' + wanted.join(', ') + ' — this file starts differently.' };
  }
  const entries = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const [date, payee, category, amountText, account, note] = row;
    const amount = parseFloat(amountText);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { error: 'Row ' + (r + 1) + ' has no usable date (use YYYY-MM-DD).' };
    if (!Number.isFinite(amount)) return { error: 'Row ' + (r + 1) + ' has no usable amount.' };
    if (!payee || !payee.trim()) return { error: 'Row ' + (r + 1) + ' has no payee.' };
    const known = categoryById(category || '');
    if (!category || category !== known.id) {
      return { error: 'Row ' + (r + 1) + ' names a category the household does not track: ' + (category || '(blank)') + '.' };
    }
    entries.push({ date, payee: payee.trim(), category, amount, account: account || 'checking', note: note || '' });
  }
  return { entries };
}

export async function importLedgerCSV(file, rerender) {
  let text;
  try {
    text = await readFileAsText(file);
  } catch {
    toast('That file could not be read — try exporting again first.');
    return;
  }
  const rows = parseCSV(text);
  if (rows === null) {
    toast('That CSV has a quote left open — it cannot be read.');
    return;
  }
  const { entries, error } = csvRowsToTransactions(rows);
  if (error) {
    toast(error);
    return;
  }
  for (const entry of entries) addTransaction(entry);
  toast('Imported ' + entries.length + ' transactions from the CSV');
  rerender(false);
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
  const exportCsvBtn = document.getElementById('data-export-csv');
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportLedgerCSV());
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
  const importCsvBtn = document.getElementById('data-import-csv-btn');
  const csvPicker = document.getElementById('data-import-csv-file');
  if (importCsvBtn && csvPicker) {
    importCsvBtn.addEventListener('click', () => csvPicker.click());
    csvPicker.addEventListener('change', () => {
      const file = csvPicker.files && csvPicker.files[0];
      csvPicker.value = '';
      if (file) importLedgerCSV(file, rerender);
    });
  }
  const resetBtn = document.getElementById('data-reset');
  if (resetBtn) resetBtn.addEventListener('click', () => resetLedgerData(rerender));
}
