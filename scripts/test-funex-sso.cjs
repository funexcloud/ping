#!/usr/bin/env node
"use strict";

function sanitizeFunexReturnTo(raw, fallback = "/start") {
  if (!raw || raw.length > 2048) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}

const cases = [
  ["/start", "/start"],
  ["/obituary-form", "/obituary-form"],
  ["https://evil.example.com", "/start"],
  ["//evil.example.com", "/start"],
  ["/\\evil", "/start"],
  [null, "/start"],
];

let failed = 0;
for (const [input, expected] of cases) {
  const got = sanitizeFunexReturnTo(input);
  if (got !== expected) {
    console.error("FAIL", input, "→", got, "expected", expected);
    failed += 1;
  }
}

if (failed) {
  process.exit(1);
}
console.log("funex-sso returnTo allowlist: PASS");
