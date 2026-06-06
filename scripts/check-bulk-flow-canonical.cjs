#!/usr/bin/env node
'use strict';

/**
 * 대량 플로 — 레거시 index.html 합류 제거·/start 캐논 검증
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
let failed = 0;

function fail(msg) {
  console.error('FAIL', msg);
  failed += 1;
}

function ok(msg) {
  console.log('OK', msg);
}

for (const rel of ['public/index.html', 'index.html', 'legacy-html/index.html']) {
  if (fs.existsSync(path.join(root, rel))) fail(`legacy UI file still present: ${rel}`);
}

const mainPath = fs.readFileSync(path.join(root, 'src/lib/ping-main-path.ts'), 'utf8');
if (!mainPath.includes('"/start"')) fail('PING_MAIN_APP_PATH must be /start');
else ok('PING_MAIN_APP_PATH → /start');

const flow = fs.readFileSync(path.join(root, 'src/lib/ping-flow-client.ts'), 'utf8');
if (flow.includes('index.html')) fail('ping-flow-client must not reference index.html');
if (!flow.includes('mergeToBulkFlow')) fail('mergeToBulkFlow missing');
if (!flow.includes('PING_MAIN_APP_PATH}?mergeBulk=1')) fail('mergeToBulkFlow must use PING_MAIN_APP_PATH');
else ok('bulk merge targets /start (no index.html)');

const nextCfg = fs.readFileSync(path.join(root, 'next.config.ts'), 'utf8');
if (!nextCfg.includes('"/index.html", destination: "/start"')) {
  fail('next.config missing /index.html → /start redirect');
} else ok('next redirect /index.html → /start');

const smoke = fs.readFileSync(path.join(root, 'scripts/smoke-test.js'), 'utf8');
if (!smoke.includes("'/start'")) fail('smoke-test should cover /start');
else ok('smoke-test includes /start');

if (failed) process.exit(1);
console.log('\nBulk flow canonical check OK.');
