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
  "ping-safe-link-store.js",
  "ping-audit-log.js",
  "ping-sensitive-log.js",
  "ping-google-credentials.js",
  "ping-app-check.js",
  "ping-request-security.js",
  "ping-kms-envelope.js",
  "ping-backup-retention.js",
  "ping-member-backup.js",
  "referral-api.js",
  "ping-toss-checkout-api.js",
  "bugo-import.js",
  "lib/ping-mourner-account.cjs",
  "lib/ping-obituary-settings.cjs",
  "lib/ping-obituary-designs.cjs",
  "lib/bugo-funeral-parse.cjs",
  "lib/funeral-rooms-catalog.cjs",
  "crematoriums-public-api.js",
  "lib/funeral-rooms-runtime.cjs",
  "lib/ping-member-auth-app.cjs",
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
  "scripts/setup-vercel-gcp-wif.mjs",
  "scripts/setup-cloud-kms.mjs",
  "scripts/setup-backup-bucket.mjs",
  "scripts/backup-member-store.cjs",
  "scripts/restore-member-store.cjs",
  "scripts/backup-firestore.mjs",
  "scripts/restore-firestore.mjs",
  "scripts/test-traffic-spike-control.cjs",
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
run("node", ["scripts/test-funeral-rooms-catalog.cjs"]);
run("node", ["scripts/test-crematoriums-catalog.cjs"]);
run("node", ["scripts/test-obituary-sections.cjs"]);
run("node", ["scripts/test-obituary-guest-view.cjs"]);
run("node", ["scripts/test-safe-link-store.cjs"]);
run("node", ["scripts/test-mourner-account.cjs"]);
run("node", ["scripts/test-audit-log.cjs"]);
run("node", ["scripts/test-member-auth-recover.cjs"]);
run("node", ["scripts/test-member-auth-dev-login.cjs"]);
run("node", ["scripts/test-sensitive-log.cjs"]);
run("node", ["scripts/test-google-credentials.cjs"]);
run("node", ["scripts/test-request-security.cjs"]);
run("node", ["scripts/test-traffic-spike-control.cjs"]);
run("node", ["scripts/test-kms-envelope.cjs"]);
run("node", ["scripts/test-backup-retention.cjs"]);
run("node", ["scripts/check-service-account-key-exposure.cjs"]);
run("node", ["scripts/check-cloud-run-secret-boundary.cjs"]);
run("node", ["scripts/check-security-build-gates.cjs"]);
run("node", ["scripts/check-security-tier2-ops.cjs"]);
run("node", ["scripts/check-security-tier3-ops.cjs"]);
run("npm", ["run", "test:firestore-rules"]);
run("node", ["scripts/check-mobile-layout-contract.cjs"]);
run("node", ["scripts/check-ping-brand-assets.cjs"]);
run("node", ["scripts/check-ping-mobile-canonical.cjs"]);
run("node", ["scripts/build-bugo-funeral-parse.mjs"]);
run("node", ["scripts/test-bugo-import-parse.cjs"]);
run("node", ["scripts/check-bugo-import-boundary.cjs"]);
run("node", ["scripts/audit-input-styles.cjs"]);
run("node", ["scripts/check-deployment-axis.cjs"]);
run("node", ["scripts/check-bulk-flow-canonical.cjs"]);
run("node", ["scripts/check-html-migration-complete.cjs"]);
run("node", [
  "scripts/check-vercel-production-env.cjs",
  "--strict",
  "--env-file",
  "scripts/vercel-production-env-fixture.env",
]);
