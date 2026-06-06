#!/usr/bin/env node
'use strict';

/**
 * Vercel Production env 점검 — 로컬 `.env` 또는 `--strict` 시 필수 키 존재 확인.
 * @see docs/vercel-production-handoff.md
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const spec = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'vercel-production-env-required.json'), 'utf8'),
);
const strict = process.argv.includes('--strict');

function loadDotEnv() {
  const p = path.join(root, '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = { ...loadDotEnv(), ...process.env };
let warn = 0;
let fail = 0;

function has(key) {
  return Boolean(String(env[key] || '').trim());
}

for (const group of spec.requiredOneOf || []) {
  if (!group.some(has)) {
    const msg = `need one of: ${group.join(' | ')}`;
    if (strict) {
      console.error('FAIL', msg);
      fail += 1;
    } else {
      console.warn('WARN', msg, '(set in Vercel Production or local .env)');
      warn += 1;
    }
  } else {
    console.log('OK', 'API origin configured');
  }
}

for (const key of spec.requiredForProduction || []) {
  if (key === 'PING_BACKEND_API_ORIGIN' || key === 'PING_EXPRESS_ORIGIN') continue;
  if (!has(key)) {
    const msg = `missing ${key}`;
    if (strict) {
      console.error('FAIL', msg);
      fail += 1;
    } else {
      console.warn('WARN', msg);
      warn += 1;
    }
  } else {
    console.log('OK', key);
  }
}

for (const key of spec.recommended || []) {
  if (!has(key)) console.warn('WARN recommended:', key);
}

if (fail) process.exit(1);
console.log(`\nVercel env check done (${warn} warn, production checklist: docs/vercel-production-handoff.md).`);
