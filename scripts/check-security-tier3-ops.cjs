#!/usr/bin/env node
'use strict';

/**
 * Tier 3 게이트 — src/ 클라이언트 Firestore/Storage 직접 쓰기 0, PII 매트릭스, memorial prod 분리.
 * @see docs/security-completion-definition.md
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'security-build-manifest.json'), 'utf8'),
);
const enforce = process.env.PING_TIER3_ENFORCE === '1';
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function listFiles(dir, ext, acc = []) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return acc;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) listFiles(rel, ext, acc);
    else if (!ext || rel.endsWith(ext)) acc.push(rel);
  }
  return acc;
}

const writePatterns = [/\baddDoc\s*\(/, /\bsetDoc\s*\(/, /\bupdateDoc\s*\(/, /\bdeleteDoc\s*\(/, /\buploadBytes\s*\(/];
const legacyAllowed = new Set(manifest.clientFirestoreWrites.allowed.filter((p) => p.startsWith('assets/')));
const legacyDebt = new Map(
  (manifest.clientFirestoreWrites.debtExceptions || [])
    .filter((e) => String(e.path).startsWith('assets/'))
    .map((e) => [e.path, e]),
);
const today = new Date().toISOString().slice(0, 10);

for (const file of listFiles('src', null)) {
  if (!/\.(tsx?|jsx?)$/.test(file)) continue;
  const text = read(file);
  if (writePatterns.some((re) => re.test(text))) {
    failures.push(`[tier3-client-writes] ${file} must not use client Firestore/Storage writes`);
  }
}

for (const file of legacyAllowed) {
  if (!legacyDebt.has(file)) {
    failures.push(`[tier3-legacy] ${file} missing debtExceptions entry`);
  } else if (legacyDebt.get(file).expires < today) {
    failures.push(`[tier3-legacy] ${file} debt expired (${legacyDebt.get(file).expires})`);
  }
}

const requiredDocs = ['docs/pii-field-matrix.md', 'docs/security-completion-definition.md'];
for (const doc of requiredDocs) {
  if (!fs.existsSync(path.join(root, doc))) failures.push(`[tier3-docs] missing ${doc}`);
}

const middleware = read('src/middleware.ts');
if (!/PING_MEMORIAL_ENABLED/.test(middleware) || !/pathname\.startsWith\("\/memorial"\)/.test(middleware)) {
  failures.push('[tier3-memorial] middleware must gate /memorial with PING_MEMORIAL_ENABLED');
}

const firestore = read('firestore.rules');
if (/ping_orders[\s\S]*allow create: if validPingOrderCreate/.test(firestore)) {
  failures.push('[tier3-rules] ping_orders client create must be denied');
}
if (/ping_obituaries[\s\S]*allow create: if validPingObituaryCreate/.test(firestore)) {
  failures.push('[tier3-rules] ping_obituaries client create must be denied');
}

const apiRoutes = [
  'src/app/api/orders/create/route.ts',
  'src/app/api/orders/new-id/route.ts',
  'src/app/api/obituary/create/route.ts',
];
for (const route of apiRoutes) {
  if (!fs.existsSync(path.join(root, route))) {
    failures.push(`[tier3-api] missing ${route}`);
  } else if (!/enforcePublicRequestSecurity/.test(read(route))) {
    failures.push(`[tier3-api] ${route} missing enforcePublicRequestSecurity`);
  }
}

if (!fs.existsSync(path.join(root, 'lib/ping-firestore-write-server.cjs'))) {
  failures.push('[tier3-api] missing lib/ping-firestore-write-server.cjs');
}

if (failures.length) {
  console.error('Tier 3 security check FAILED:');
  failures.forEach((f) => console.error('-', f));
  process.exit(1);
}

if (enforce) {
  console.log('Tier 3 security check OK (enforce mode).');
} else {
  console.log(`Tier 3 security check OK (${legacyAllowed.size} legacy asset path(s) with debt).`);
}
