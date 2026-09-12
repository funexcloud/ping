#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

/**
 * Canonical 580px contract for files that exist in this release.
 * Untracked screens (mourner-account, guest obituary CSS) are not required here.
 */
const checks = [
  {
    file: "src/components/bulk/recipient-exclude-modal.css",
    required: ["max-width: min(var(--ping-column-max), 100%)"],
  },
  {
    file: "src/components/ping-mobile/phone-mockup.css",
    required: ["aspect-ratio: 9 / 19.2"],
  },
];

const failures = [];
for (const check of checks) {
  const absolute = path.join(root, check.file);
  if (!fs.existsSync(absolute)) {
    failures.push(`${check.file}: missing file`);
    continue;
  }
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

console.log("Product column layout contract OK.");
