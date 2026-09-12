#!/usr/bin/env node
/**
 * Brand foundation files — icons exist and manifest points at Next app icons.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const failures = [];

function mustExist(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    failures.push(`missing file: ${rel}`);
  }
}

function mustContain(rel, token) {
  const abs = path.join(root, rel);
  const source = fs.readFileSync(abs, "utf8");
  if (!source.includes(token)) {
    failures.push(`${rel}: missing ${token}`);
  }
}

function mustNotContain(rel, token) {
  const abs = path.join(root, rel);
  const source = fs.readFileSync(abs, "utf8");
  if (source.includes(token)) {
    failures.push(`${rel}: forbidden ${token}`);
  }
}

mustExist("src/app/favicon.ico");
mustExist("src/app/icon.png");
mustExist("src/app/apple-icon.png");
mustExist("public/brand/ping/ping-app-logo-canonical.png");
mustExist("docs/references/ping-brand/ping-app-logo-canonical.png");
mustExist("assets/images/ping-logo-black.webp");
mustExist("ping_logo_svg.svg");

mustContain("src/lib/ping-brand.ts", 'export const PING_BRAND_PRIMARY = "#0056F3"');
mustContain(
  "src/lib/ping-brand.ts",
  'export const PING_LOGO_CANONICAL_SRC = "/brand/ping/ping-app-logo-canonical.png"',
);
mustContain("src/lib/ping-brand.ts", 'export const PING_APP_ICON_SRC = "/icon.png"');
mustContain("src/app/manifest.ts", "PING_LOGO_CANONICAL_SRC");
mustContain("src/app/manifest.ts", "PING_APP_ICON_SRC");
mustContain("src/app/manifest.ts", "PING_BRAND_PRIMARY");
mustContain("assets/css/ping-ui.css", "--ping-color-primary: #0056F3");
mustNotContain("src/app/manifest.ts", "ping_logo.png");
mustNotContain("src/lib/ping-brand.ts", "ping-logo-black.webp");
mustNotContain("src/lib/ping-brand.ts", "ping_logo_svg.svg");

if (failures.length) {
  console.error("PING brand asset contract failed:");
  failures.forEach((line) => console.error(`- ${line}`));
  process.exit(1);
}

console.log("PING brand asset contract OK.");
