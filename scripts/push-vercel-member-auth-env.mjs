#!/usr/bin/env node
/**
 * Express 없이 Next(Vercel)에서 회원·게스트 인증 — Production env 등록
 *
 *   node scripts/push-vercel-member-auth-env.mjs --sa path/to/firebase-adminsdk.json
 *   node scripts/push-vercel-member-auth-env.mjs --dry-run --sa ./key.json
 *
 * 사전: Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키(JSON)
 * Cloud Run Express와 동일 버킷: ping-3a510-member-auth (기본)
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const saIdx = process.argv.indexOf("--sa");
const saPath = saIdx >= 0 ? process.argv[saIdx + 1] : "";

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

function minifyServiceAccountJson(filePath) {
  const abs = path.resolve(root, filePath);
  if (!fs.existsSync(abs)) {
    console.error(`Service account file not found: ${abs}`);
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    console.error("Invalid JSON in service account file:", e.message);
    process.exit(1);
  }
  if (!parsed.client_email || !parsed.private_key) {
    console.error("File does not look like a Firebase/GCP service account JSON.");
    process.exit(1);
  }
  return JSON.stringify(parsed);
}

const project =
  process.env.GCP_PROJECT ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "ping-3a510";
const bucket =
  process.env.PING_MEMBER_GCS_BUCKET || `${String(project).trim()}-member-auth`;
const oauthSecret =
  process.env.PING_OAUTH_STATE_SECRET?.trim() ||
  randomBytes(32).toString("hex");

if (!saPath) {
  console.error(
    "Usage: node scripts/push-vercel-member-auth-env.mjs --sa <firebase-adminsdk.json> [--dry-run]",
  );
  console.error(
    "\nFirebase: Console → Project settings → Service accounts → Generate new private key",
  );
  process.exit(1);
}

const saJson = minifyServiceAccountJson(saPath);

console.log(
  dryRun
    ? "Dry-run — member auth env for Vercel Production"
    : "Pushing member auth env to Vercel Production (funexcloud/ping_mobile)…",
);
console.log(`Bucket (default): ${bucket}`);

pushEnv("FIREBASE_SERVICE_ACCOUNT_JSON", saJson);
pushEnv("PING_MEMBER_GCS_BUCKET", bucket);
pushEnv("PING_OAUTH_STATE_SECRET", oauthSecret);

console.log(
  "\nDone. Redeploy production:",
  "\n  npx vercel deploy --prod --yes",
  "\nThen verify:",
  "\n  curl -sS https://ping.funexcloud.com/api/auth/kakao/config",
  "\n  npm run verify:production",
);
if (!process.env.PING_OAUTH_STATE_SECRET && !dryRun) {
  console.log(
    "\nNote: PING_OAUTH_STATE_SECRET was auto-generated. Save it locally in .env if you need the same value across machines.",
  );
}
