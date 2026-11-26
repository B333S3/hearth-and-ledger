// charts.js — hand-drawn SVG charts. No libraries: a donut for category share,
// grouped bars for income vs spending, and a ring for goal and budget progress.

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const [sx, sy] = polar(cx, cy, rOuter, startAngle);
  const [ex, ey] = polar(cx, cy, rOuter, endAngle);
  const [six, siy] = polar(cx, cy, rInner, endAngle);
  const [eix, eiy] = polar(cx, cy, rInner, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${rOuter} ${rOuter} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} L ${six.toFixed(2)} ${siy.toFixed(2)} A ${rInner} ${rInner} 0 ${large} 0 ${eix.toFixed(2)} ${eiy.toFixed(2)} Z`;
}

// Donut of {label, value, color}. Center shows the total. Slices under 2% are
// grouped into the last slice's neighbour visually by simply being thin — the
// legend below the chart (rendered by the caller) carries their names.
export function donutSVG(segments, centerLabel, centerValue, size = 190) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) return '<p class="mini-note">Nothing spent yet this month.</p>';
  const cx = size / 2, cy = size / 2, rO = size / 2 - 4, rI = rO * 0.62;
  let angle = 0;
  const parts = [];
  for (const seg of segments) {
    const sweep = (seg.value / total) * 360;
    if (sweep > 0.6) {
      parts.push(`<path d="${arcPath(cx, cy, rO, rI, angle, angle + sweep - 0.8)}" fill="${seg.color}"><title>${seg.label}</title></path>`);
    }
    angle += sweep;
  }
  return `<svg class="chart-box" viewBox="0 0 ${size} ${size}" role="img" aria-label="Spending by category">
    ${parts.join('')}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="12.5" fill="#75816F" font-weight="700">${centerLabel}</text>
    <text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="19" fill="#26332B" font-weight="700" font-family="Georgia, serif">${centerValue}</text>
  </svg>`;
}

// Grouped bars: one group per month, income in sage, spending in terracotta.
export function cashFlowSVG(rows, fmt) {
  const w = 560, h = 218, padL = 8, padB = 26, padT = 12;
  // Guard the empty-month case: with no income and no spending max would be 0
  // and every bar height would divide by zero.
  const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.spent])) * 1.12;
  const groupW = (w - padL * 2) / rows.length;
  const barW = Math.min(26, groupW / 3.4);
  const base = h - padB;
  let out = `<svg class="chart-box" viewBox="0 0 ${w} ${h}" role="img" aria-label="Income versus spending for the last six months">`;
  rows.forEach((r, i) => {
    const gx = padL + i * groupW + groupW / 2;
    const ih = (r.income / max) * (base - padT);
    const sh = (r.spent / max) * (base - padT);
    out += `<rect x="${(gx - barW - 3).toFixed(1)}" y="${(base - ih).toFixed(1)}" width="${barW}" height="${ih.toFixed(1)}" rx="4" fill="#2E7D5B"><title>Income ${fmt(r.income)}</title></rect>`;
    out += `<rect x="${(gx + 3).toFixed(1)}" y="${(base - sh).toFixed(1)}" width="${barW}" height="${sh.toFixed(1)}" rx="4" fill="#C4622D"><title>Spent ${fmt(r.spent)}</title></rect>`;
    out += `<text x="${gx}" y="${h - 8}" text-anchor="middle" font-size="12" fill="#75816F" font-weight="600">${r.label}</text>`;
  });
  out += `<line x1="${padL}" y1="${base}" x2="${w - padL}" y2="${base}" stroke="#E6DBC4" stroke-width="1.5"/>`;
  out += '</svg>';
  return out;
}

// A progress ring: percent 0..100 (values over 100 are clamped for drawing).
export function ringSVG(percent, color, size = 74, label = '') {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const shown = Math.max(0, Math.min(100, percent));
  const off = c * (1 - shown / 100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label || percent + '%'}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#EFE6D2" stroke-width="8"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="54%" text-anchor="middle" font-size="15" font-weight="700" fill="#26332B">${Math.round(percent)}%</text>
  </svg>`;
}

// Horizontal bars for the category comparison table on Insights.
export function compareBar(value, max, color) {
  const w = Math.max(2, Math.round((value / Math.max(1, max)) * 100));
  return `<span style="display:inline-block;vertical-align:middle;width:110px;height:9px;border-radius:99px;background:#EFE6D2;overflow:hidden"><i style="display:block;height:100%;width:${w}%;background:${color};border-radius:99px"></i></span>`;
}
