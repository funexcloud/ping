#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const checks = [
  {
    file: "src/app/globals.css",
    required: ["box-sizing: border-box", "margin: 0", "overflow-x: clip", "--ping-column-max: 580px"],
  },
  {
    file: "src/components/ping-global-layout.tsx",
    required: ['fullWidth ? "max-w-none" : "max-w-[var(--ping-column-max)] bg-white"'],
  },
  {
    file: "src/app/start/bulk-entry-client.tsx",
    forbidden: ["max-w-md"],
  },
  {
    file: "src/app/obituary-create/obituary-create-client.tsx",
    forbidden: ["max-w-md"],
  },
  {
    file: "src/app/mourner-info/mourner-info.css",
    required: ["max-width: var(--ping-column-max)"],
    forbidden: ["max-width: 480px"],
  },
  {
    file: "src/app/obituary-form/obituary-form.css",
    required: ["max-width: var(--ping-column-max)"],
    forbidden: ["max-width: 480px"],
  },
  {
    file: "src/app/obituary-form/obituary-form-client.tsx",
    forbidden: ["max-w-[480px]"],
  },
  {
    file: "src/app/mourner-info/mourner-info-client.tsx",
    forbidden: ["max-w-[480px]"],
  },
  {
    file: "src/app/mourner-account/mourner-account.css",
    required: ["max-width: var(--ping-column-max)"],
    forbidden: ["max-width: 480px"],
  },
  {
    file: "src/app/obituary/public/ping-obituary-guest.css",
    required: ["max-width: var(--ping-column-max)"],
    forbidden: ["max-width: 480px"],
  },
  {
    file: "src/app/guide/naver-contacts/guide-naver-contacts-client.tsx",
    forbidden: ["max-w-[480px]"],
  },
  {
    file: "src/components/bulk/recipient-exclude-modal.css",
    required: ["max-width: min(var(--ping-column-max), 100%)"],
  },
];

const failures = [];
for (const check of checks) {
  const absolute = path.join(root, check.file);
  const source = fs.readFileSync(absolute, "utf8");
  for (const token of check.required || []) {
    if (!source.includes(token)) failures.push(`${check.file}: missing ${token}`);
  }
  for (const token of check.forbidden || []) {
    if (source.includes(token)) failures.push(`${check.file}: forbidden ${token}`);
  }
}

if (failures.length) {
  console.error("Mobile layout contract failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Product column 580px layout contract OK.");
