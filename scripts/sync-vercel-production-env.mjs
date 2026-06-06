#!/usr/bin/env node
/**
 * 로컬 `.env` + 프로덕션 캐논 URL → Vercel Production env 동기화
 *   node scripts/sync-vercel-production-env.mjs
 *   node scripts/sync-vercel-production-env.mjs --dry-run
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

/** @see docs/deployment-axis-decision.md */
const PRODUCTION_OVERRIDES = {
  PING_BACKEND_API_ORIGIN: "https://ping-3a510.web.app",
  NEXT_PUBLIC_SITE_URL: "https://ping.funexcloud.com",
  PING_PUBLIC_ORIGIN: "https://ping.funexcloud.com",
};

function readExpressOriginFile() {
  const p = path.join(root, ".ping-express-origin");
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8").trim().replace(/\/+$/, "");
}

const SYNC_KEYS = [
  "PING_BACKEND_API_ORIGIN",
  "PING_EXPRESS_ORIGIN",
  "NEXT_PUBLIC_SITE_URL",
  "PING_PUBLIC_ORIGIN",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_API_KEY",
  "KAKAO_REST_API_KEY",
  "KAKAO_CLIENT_SECRET",
  "KAKAO_REDIRECT_URI",
  "KAKAO_BUSINESS_REDIRECT_URI",
  "KAKAO_LOGIN_RETURN_ORIGIN",
  "PORTONE_CHANNEL_KEY",
  "PING_USE_TOSS_DOCS_TEST_KEYS",
  "TOSS_PAYMENTS_WIDGET_CLIENT_KEY",
  "TOSS_PAYMENTS_SECRET_KEY",
  "PING_TOSS_CONFIRM_MOCK",
  "PING_SKIP_FIREBASE_STORAGE_UPLOAD",
  "SOLAPI_API_KEY",
  "SOLAPI_API_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "PING_SAFE_LINK_SECRET",
];

function loadDotEnv() {
  const p = path.join(root, ".env");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function pushEnv(key, value) {
  const v = String(value ?? "").trim();
  if (!v) {
    console.warn(`skip (empty): ${key}`);
    return;
  }
  if (dryRun) {
    console.log(`[dry-run] ${key}=(${v.length} chars)`);
    return;
  }
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vercel@latest", "env", "add", key, "production", "--force"],
    {
      cwd: root,
      input: v,
      stdio: ["pipe", "inherit", "inherit"],
      shell: process.platform === "win32",
    },
  );
  if (r.status !== 0) {
    console.error(`FAIL vercel env add ${key}`);
    process.exit(r.status ?? 1);
  }
  console.log(`OK ${key}`);
}

const local = loadDotEnv();
const merged = {
  ...local,
  ...PRODUCTION_OVERRIDES,
  PING_EXPRESS_ORIGIN:
    local.PING_EXPRESS_ORIGIN ||
    readExpressOriginFile() ||
    PRODUCTION_OVERRIDES.PING_EXPRESS_ORIGIN,
};

console.log(
  dryRun
    ? "Dry-run — Vercel Production env sync"
    : "Syncing Vercel Production env (funexcloud/ping_mobile)…",
);
for (const key of SYNC_KEYS) {
  pushEnv(key, merged[key] ?? PRODUCTION_OVERRIDES[key]);
}
console.log("\nDone. Redeploy: npx vercel@latest deploy --prod");
