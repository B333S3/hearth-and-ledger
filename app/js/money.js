// money.js — formatting and calendar helpers shared by every view.

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// $1,234.56 — always with cents, for ledger amounts.
export function fmtMoney(n) {
  return usd.format(n);
}

// $1,235 — whole dollars, for headlines and chart labels.
export function fmtWhole(n) {
  return usdWhole.format(n);
}

// +$45.00 / −$45.00 with a real minus sign for negatives.
export function fmtSigned(n) {
  if (n > 0) return '+' + usd.format(n);
  if (n < 0) return '−' + usd.format(Math.abs(n));
  return usd.format(0);
}

// '2026-11-04' -> 'Nov 4'
export function fmtDay(iso) {
  const d = new Date(iso + 'T12:00:00');
  return MONTH_NAMES[d.getMonth()].slice(0, 3) + ' ' + d.getDate();
}

// '2026-11-04' -> 'Wednesday, Nov 4'
export function fmtDayLong(iso) {
  const d = new Date(iso + 'T12:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()] + ', ' + fmtDay(iso);
}

// A month key is 'YYYY-MM'. These helpers move between keys, labels and dates.
export function monthKeyOf(isoDate) {
  return isoDate.slice(0, 7);
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return MONTH_NAMES[m - 1] + ' ' + y;
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return d.getFullYear() + '-' + mm;
}

export function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// Whole days from today until an ISO date (negative when past).
export function daysUntil(iso) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const target = new Date(iso + 'T12:00:00');
  return Math.round((target - today) / 86400000);
}

export function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

export function pct(part, whole) {
  if (!whole || !Number.isFinite(part) || !Number.isFinite(whole)) return 0;
  return Math.round((part / whole) * 100);
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
