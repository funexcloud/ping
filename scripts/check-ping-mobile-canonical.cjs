#!/usr/bin/env node
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
  const source = fs.readFileSync(path.join(root, rel), "utf8");
  if (!source.includes(token)) failures.push(`${rel}: missing ${token}`);
}

function mustNotContain(rel, token) {
  const source = fs.readFileSync(path.join(root, rel), "utf8");
  if (source.includes(token)) failures.push(`${rel}: forbidden ${token}`);
}

mustExist("docs/references/ping-brand/ping-app-logo-canonical.png");
mustExist("docs/references/ping-mobile/ping-mobile-contacts-canonical.png");
mustExist("docs/references/ping-mobile/ping-mobile-sending-canonical.png");
mustExist("docs/PING_MOBILE_MOCKUP_CANONICAL.md");
mustExist("docs/PING_UI_LOCK.md");
mustExist("src/components/ping-mobile/phone-mockup.tsx");
mustExist("src/components/ping-mobile/ping-mobile-screens.tsx");

mustContain("docs/PING_MOBILE_MOCKUP_CANONICAL.md", "Status: LOCKED");
mustContain(
  "docs/PING_MOBILE_MOCKUP_CANONICAL.md",
  "Do not redesign the smartphone mockup or mobile UI language.",
);
mustContain("docs/PING_UI_LOCK.md", "Reuse the shared phone mockup component.");
mustContain("docs/PING_MOBILE_MOCKUP_CANONICAL.md", "Canonical Brand Asset");
mustContain(
  "docs/PING_MOBILE_MOCKUP_CANONICAL.md",
  "The approved PING logo is a locked canonical brand asset.",
);
mustContain("src/components/ping-mobile/ping-mobile-screens.tsx", "PingBrandLogo");
mustContain("src/app/intro/intro-client.tsx", "PhoneMockup");
mustNotContain("src/app/intro/intro-client.tsx", "intro-device__hole");
mustNotContain("src/components/intro/PhoneDeviceFrame.tsx", "PHONE_MOCKUP_HERO");
mustNotContain("src/components/ping-mobile/phone-mockup.tsx", "Dynamic Island");

if (failures.length) {
  console.error("PING mobile canonical contract failed:");
  failures.forEach((line) => console.error(`- ${line}`));
  process.exit(1);
}

console.log("PING mobile canonical contract OK.");
