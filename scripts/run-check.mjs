#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const nodeCheckFiles = [
  "index.js",
  "server.js",
  "funeral-odms-config.js",
  "ping-order-finalize.js",
  "ping-order-admin-api.js",
  "ping-admin-auth.js",
  "ping-marketing-aggregate.js",
  "ping-order-purge.js",
  "referral-api.js",
  "ping-toss-checkout-api.js",
  "bugo-import.js",
  "lib/bugo-funeral-parse.cjs",
  "bugo-message-template.js",
  "send-coupon-api.js",
  "six-digit-code.js",
  "member-auth.js",
  "email-resend.js",
  "sms-service.js",
  "ping-sms-dispatch-lock.js",
  "ping-order-fulfillment.js",
  "solapi-otp.js",
  "guest-sms-auth.js",
  "ping-dispatch/index.js",
  "ping-dispatch/dispatchPaidOrder.js",
  "ping-dispatch/solapiChunks.js",
  "ping-dispatch/buildMessages.js",
  "ping-dispatch/config.js",
  "assets/js/ping-backend-api-path.js",
  "assets/js/ping-member-login.js",
  "assets/js/overview-interactive.js",
  "scripts/load-local-env.js",
  "scripts/solapi-auth-fetch.js",
  "scripts/test-solapi-send.js",
  "scripts/solapi-notify-work-done.js",
];

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: process.platform === "win32", ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

for (const f of nodeCheckFiles) {
  run("node", ["--check", f]);
}

run("node", ["scripts/test-naver-addressbook-parse.mjs"]);
run("node", ["scripts/test-bugo-import-url.cjs"]);
run("node", ["scripts/build-bugo-funeral-parse.mjs"]);
run("node", ["scripts/test-bugo-import-parse.cjs"]);
run("node", ["scripts/check-bugo-import-boundary.cjs"]);
run("node", ["scripts/audit-input-styles.cjs"]);
run("node", ["scripts/check-deployment-axis.cjs"]);
run("node", ["scripts/check-bulk-flow-canonical.cjs"]);
run("node", ["scripts/check-html-migration-complete.cjs"]);
run("node", ["scripts/check-vercel-production-env.cjs"]);
