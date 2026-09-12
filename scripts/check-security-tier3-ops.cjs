#!/usr/bin/env node
'use strict';

/**
 * Tier 3 — no client Firestore/Storage writes in src/,
 * checkout order path is server-owned, ping_orders client create stays denied.
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

const checkoutPrep = 'src/lib/ping-bulk-checkout-prep.ts';
if (!fs.existsSync(path.join(root, checkoutPrep))) {
  failures.push(`[tier3-checkout] missing ${checkoutPrep}`);
} else {
  const prep = read(checkoutPrep);
  if (!prep.includes('fetch("/api/orders/create"')) {
    failures.push('[tier3-checkout] ping-bulk-checkout-prep must POST /api/orders/create');
  }
  if (writePatterns.some((re) => re.test(prep))) {
    failures.push('[tier3-checkout] ping-bulk-checkout-prep must not use client Firestore/Storage writes');
  }
}

const createRoute = 'src/app/api/orders/create/route.ts';
if (!fs.existsSync(path.join(root, createRoute))) {
  failures.push(`[tier3-api] missing ${createRoute}`);
} else {
  const route = read(createRoute);
  if (!route.includes('prepareServerOrderRequest')) {
    failures.push('[tier3-api] /api/orders/create must validate via ping-server-order-domain');
  }
  if (!route.includes('ping-server-order-store')) {
    failures.push('[tier3-api] /api/orders/create must persist via ping-server-order-store');
  }
}

const storeRel = 'lib/ping-server-order-store.cjs';
if (!fs.existsSync(path.join(root, storeRel))) {
  failures.push(`[tier3-api] missing ${storeRel}`);
} else {
  const store = read(storeRel);
  if (!store.includes('getPingFirestoreAdmin')) {
    failures.push('[tier3-api] ping-server-order-store must use Admin SDK Firestore');
  }
}

const firestore = read('firestore.rules');
if (/ping_orders[\s\S]*allow create: if validPingOrderCreate/.test(firestore)) {
  failures.push('[tier3-rules] ping_orders client create must be denied');
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
