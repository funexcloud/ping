#!/usr/bin/env node
'use strict';

/**
 * 입력 필드 CSS 사용처 감사 — `node scripts/audit-input-styles.cjs`
 * migrate | exclude | needs-modifier 태그로 분류.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

const INVENTORY = [
  {
    tag: 'migrate',
    file: 'src/app/start/bulk-entry-client.tsx',
    pattern: 'ping-field-standard',
    note: 'URL + compose title',
  },
  {
    tag: 'migrate',
    file: 'src/app/send/url/send-url-client.tsx',
    pattern: 'ping-field-standard',
    note: 'send/url URL',
  },
  {
    tag: 'migrate',
    file: 'src/app/member-login/member-login-email-legacy.tsx',
    pattern: 'ping-field-standard',
    note: 'member login',
  },
  {
    tag: 'migrate',
    file: 'src/app/obituary-signup-register/obituary-signup-register-client.tsx',
    pattern: 'ping-field-standard',
    note: 'signup register',
  },
  {
    tag: 'migrate',
    file: 'src/app/obituary-verify-email/obituary-verify-email-client.tsx',
    pattern: 'ping-field-standard',
    note: 'email line only',
  },
  {
    tag: 'needs-modifier',
    file: 'src/app/start/bulk-entry-client.tsx',
    pattern: 'ping-field-standard--with-trailing',
    note: 'compose title counter',
  },
  {
    tag: 'needs-modifier',
    file: 'src/app/checkout/checkout-client.tsx',
    pattern: 'ping-field-numeric',
    note: 'checkout points',
  },
  {
    tag: 'exclude',
    file: 'src/app/obituary-verify-email/obituary-verify-email-client.tsx',
    pattern: 'verify-otp-digit',
    note: 'OTP grid',
  },
  {
    tag: 'exclude',
    file: 'src/app/obituary-guest-verify/obituary-guest-verify-client.tsx',
    pattern: 'guest-otp-digit',
    note: 'OTP grid',
  },
  {
    tag: 'exclude',
    file: 'src/app/obituary-form/obituary-form-client.tsx',
    pattern: 'input-outline',
    note: 'shadcn form',
  },
  {
    tag: 'exclude',
    file: 'src/app/memorial/hall/memorial-hall-client.tsx',
    pattern: 'form-input',
    note: 'legacy embed',
  },
  {
    tag: 'exclude',
    file: 'src/app/admin/monitoring/admin-monitoring-client.tsx',
    pattern: 'from "@/components/ui/input"',
    note: 'admin shadcn',
  },
];

let failed = 0;
for (const row of INVENTORY) {
  const fp = path.join(root, row.file);
  if (!fs.existsSync(fp)) {
    console.error('MISSING', row.file);
    failed += 1;
    continue;
  }
  const text = fs.readFileSync(fp, 'utf8');
  if (!text.includes(row.pattern)) {
    console.warn('WARN not found', row.tag, row.file, row.pattern);
  } else {
    console.log(row.tag.padEnd(16), row.file, '—', row.note);
  }
}

if (failed) process.exit(1);
console.log('\nAudit inventory OK (' + INVENTORY.length + ' rows).');
