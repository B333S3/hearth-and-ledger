// A working best-site-01 entry (Node 22, standard library only): the site is this directory's app/ folder, plain
// static files a browser opens at app/index.html (ES modules, CSS, no build step), its content held in its own files:
// nothing it runs, styles or shows loads over the network. The program hands it in: it copies app/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your screenshots, the
// first load's files and bytes, and your source), with the vendored make.fun library. Leave vendor/makefun-frontend.ts
// as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// A starting point, not a winner: a plain recipe collection, a list of recipes and a page for each. Build the site the
// brief asks for in app/ (its content, ease of use, a phone layout, its look), put 3 or 4 PNG or JPEG screenshots of
// it running in screenshots/ (the first by name is the cover; one may be a 390 x 844 phone view; shots.json says which
// views this starter's were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  cpSync, existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 16 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);

// --- Build check (this entry's own addition; it reads the output back and
// reports, it never rewrites dossier.json, so the scorer's byte-for-byte
// comparison still holds) -----------------------------------------------
// Walk the copied app/ tree, count the files and bytes, and confirm nothing
// in it reaches the network: the site's promise is "fully offline", so any
// http(s) URL, remote script or stylesheet reference in the shipped files is
// a defect, not a feature.
function collectFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collectFiles(path));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

const dossierPath = join(out, 'dossier.json');
const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
const shippedFiles = collectFiles(join(out, 'app'));
const shippedBytes = shippedFiles.reduce((sum, path) => sum + statSync(path).size, 0);
const externalPattern = /https?:\/\/|src=["']https?:|href=["']https?:|@import\s+["']https?:|url\(\s*["']?https?:/i;
const offenders = shippedFiles.filter((path) => externalPattern.test(readFileSync(path, 'utf8')));
const screenshotCount = Array.isArray(dossier.images) ? dossier.images.length : 0;
const loadMatch = typeof dossier.text === 'string'
  ? dossier.text.match(/first load (\d+) files, (\d+) bytes gzip-9 \((\d+) raw\)/)
  : null;
const firstLoadFiles = loadMatch ? Number(loadMatch[1]) : 0;
const firstLoadBytes = loadMatch ? Number(loadMatch[3]) : 0;

const problems = [];
if (!dossier || typeof dossier !== 'object') problems.push('dossier.json did not parse into an object');
if (offenders.length > 0) problems.push(offenders.length + ' shipped file(s) reference a remote URL: ' + offenders.join(', '));
if (screenshotCount === 0) problems.push('no screenshots were listed in the dossier');
if (firstLoadFiles === 0) problems.push('the dossier lists no first-load files');
if (firstLoadBytes <= 0) problems.push('the dossier lists zero first-load bytes');

console.log('Hearth & Ledger build summary');
console.log('  app files shipped: ' + shippedFiles.length + ' (' + shippedBytes + ' bytes)');
console.log('  first load: ' + firstLoadFiles + ' files, ' + firstLoadBytes + ' bytes');
console.log('  screenshots: ' + screenshotCount);
console.log('  external URL references: ' + offenders.length);
if (problems.length > 0) {
  for (const problem of problems) console.error('  BUILD CHECK FAILED: ' + problem);
  process.exitCode = 1;
} else {
  console.log('  build check: ok — fully offline, dossier written');
}
