#!/usr/bin/env node
'use strict';

/**
 * HTML → React 이관 완료 검증 — `node scripts/check-html-migration-complete.cjs`
 * @see docs/html-to-next-migration-status.md
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { KEEP_HTML_BASENAMES } = require('./ping-legacy-html-redirects.cjs');

let failed = 0;

function fail(msg) {
  console.error('FAIL', msg);
  failed += 1;
}

function ok(msg) {
  console.log('OK', msg);
}

function listHtmlInDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith('.html')) out.push(name);
  }
  return out;
}

if (fs.existsSync(path.join(root, 'legacy-html'))) {
  fail('legacy-html/ must not exist in repo');
} else {
  ok('legacy-html/ absent');
}

for (const rel of ['public/index.html', 'index.html']) {
  if (fs.existsSync(path.join(root, rel))) fail(`legacy UI file present: ${rel}`);
}
ok('no index.html in repo root/public');

for (const dir of ['', 'public']) {
  const abs = dir ? path.join(root, dir) : root;
  for (const name of listHtmlInDir(abs)) {
    if (!KEEP_HTML_BASENAMES.has(name)) {
      fail(`unexpected HTML: ${dir ? `${dir}/` : ''}${name}`);
    }
  }
}
ok(`only KEEP_HTML (${[...KEEP_HTML_BASENAMES].join(', ')}) in root/public`);

const pages = [];
function walkPages(dir, prefix = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
    if (ent.isDirectory()) walkPages(path.join(dir, ent.name), rel);
    else if (ent.name === 'page.tsx') pages.push(rel.replace(/\/page\.tsx$/, ''));
  }
}
walkPages(path.join(root, 'src', 'app'));
if (pages.length < 40) fail(`expected 40+ App Router pages, found ${pages.length}`);
else ok(`${pages.length} App Router page routes`);

const requiredRoutes = [
  'start',
  'checkout',
  'payment-success',
  'send/url',
  'send/payments',
  'login/[[...slug]]',
  'member-login',
  'obituary-guest-verify',
];
for (const r of requiredRoutes) {
  if (!pages.includes(r)) fail(`missing src/app/${r}/page.tsx`);
}
ok('critical product routes present');

const flow = fs.readFileSync(path.join(root, 'src/lib/ping-flow-client.ts'), 'utf8');
if (!flow.includes('mergeToBulkFlow') || !flow.includes('PING_MAIN_APP_PATH}?mergeBulk=1')) {
  fail('mergeToBulkFlow must navigate to /start?mergeBulk=1');
} else {
  ok('mergeToBulkFlow → /start');
}

if (flow.includes('handoffReactBulkEntryToLegacyWizard')) {
  fail('remove deprecated handoffReactBulkEntryToLegacyWizard alias');
}

const sendUrl = fs.readFileSync(
  path.join(root, 'src/app/send/url/send-url-client.tsx'),
  'utf8',
);
if (sendUrl.includes('index.html')) fail('send/url must not reference index.html');
else ok('send/url → /start (no index.html)');

if (failed) process.exit(1);
console.log('\nHTML migration complete check OK.');
