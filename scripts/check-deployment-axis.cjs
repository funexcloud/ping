#!/usr/bin/env node
'use strict';

/**
 * 배포 축 결정 준수 — `node scripts/check-deployment-axis.cjs`
 * @see docs/deployment-axis-decision.md
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

const legacyInRepo = path.join(root, 'legacy-html');
if (fs.existsSync(legacyInRepo)) {
  fail('legacy-html/ still in repo — archive then remove');
} else {
  ok('legacy-html/ not in repo');
}

const archiveBase = path.join(root, '..', 'ping_mobile_legacy_html_snapshot');
if (!fs.existsSync(archiveBase)) {
  fail('missing external snapshot: ../ping_mobile_legacy_html_snapshot');
} else {
  ok('external snapshot base exists');
}

const firebase = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
const rewrites = firebase.hosting?.rewrites || [];
const htmlRewrites = rewrites.filter(
  (r) => r.destination && String(r.destination).endsWith('.html'),
);
if (htmlRewrites.length) {
  fail(`firebase.json has ${htmlRewrites.length} HTML rewrite(s) — UI must be Vercel-only`);
} else {
  ok('firebase hosting rewrites — API/functions only (no *.html destination)');
}

const materialize = fs.readFileSync(
  path.join(root, 'scripts', 'materialize-legacy-html.mjs'),
  'utf8',
);
if (materialize.includes('legacy-html') && materialize.includes('legacyRoot')) {
  fail('materialize-legacy-html.mjs still depends on legacy-html/ folder');
} else {
  ok('materialize uses repo-root verification HTML only');
}

if (failed) process.exit(1);
console.log('\nDeployment axis check OK.');
