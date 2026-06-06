#!/usr/bin/env node
'use strict';

/**
 * UI ↔ 파싱 경계 계약 — bulk-entry가 import·파싱 내부를 직접 쓰지 않는지 검사.
 * `node scripts/check-bugo-import-boundary.cjs`
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const bulkEntry = fs.readFileSync(
  path.join(root, 'src/app/start/bulk-entry-client.tsx'),
  'utf8',
);

const forbiddenInUi = [
  'tryBugoImportForUrl',
  'persistObituaryUrlToPingFromIndex',
  'applyBugoImportToPingFromIndex',
  'fetchBugoImportWithFallback',
  'isBugoFuneralImportUrl',
  'from "@/lib/bugo-import-url"',
  'from "@/lib/ping-bugo-import"',
];

const requiredInUi = ['from "@/lib/ping-bugo-import-flow"'];

let failed = 0;

for (const token of forbiddenInUi) {
  if (bulkEntry.includes(token)) {
    failed += 1;
    console.error('BOUNDARY FAIL: bulk-entry-client must not reference', token);
  }
}

for (const token of requiredInUi) {
  if (!bulkEntry.includes(token)) {
    failed += 1;
    console.error('BOUNDARY FAIL: bulk-entry-client must import', token);
  }
}

if (failed) {
  process.exit(1);
}

console.log('Bugo import UI boundary OK.');
