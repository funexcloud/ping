#!/usr/bin/env node
/**
 * Cloud Run `--env-vars-file` YAML 생성 (stdout). `.env` + 프로덕션 고정값.
 *   node scripts/build-cloud-run-env.mjs > /tmp/ping-express-env.yaml
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv() {
  const p = path.join(root, ".env");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).trim();
    }
    out[t.slice(0, i).trim()] = val;
  }
  return out;
}

const KEYS = [
  "PING_PUBLIC_ORIGIN",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_API_KEY",
  "KAKAO_REST_API_KEY",
  "KAKAO_CLIENT_SECRET",
  "KAKAO_REDIRECT_URI",
  "KAKAO_BUSINESS_REDIRECT_URI",
  "KAKAO_LOGIN_RETURN_ORIGIN",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "SOLAPI_API_KEY",
  "SOLAPI_API_SECRET",
  "PORTONE_CHANNEL_KEY",
  "TOSS_PAYMENTS_WIDGET_CLIENT_KEY",
  "TOSS_PAYMENTS_SECRET_KEY",
  "PING_USE_TOSS_DOCS_TEST_KEYS",
  "PING_TOSS_CONFIRM_MOCK",
  "PING_SKIP_FIREBASE_STORAGE_UPLOAD",
  "DATA_GO_KR_SERVICE_KEY",
  "FUNERAL_API_KEY",
];

const fixed = {
  PING_EXPRESS_API_ONLY: "1",
  PING_DEV_LIGHT: "1",
  PING_MEMBER_DATA_DIR:
    process.env.PING_EXPRESS_USE_GCS_VOLUME === "0" ? "/tmp/ping-member-auth" : "/data",
  PING_PUBLIC_ORIGIN: "https://ping.funexcloud.com",
  KAKAO_REDIRECT_URI: "https://ping.funexcloud.com/api/auth/kakao/callback",
  KAKAO_BUSINESS_REDIRECT_URI:
    "https://ping.funexcloud.com/api/auth/kakao/business/callback",
  KAKAO_LOGIN_RETURN_ORIGIN: "https://ping.funexcloud.com",
};

const local = loadDotEnv();
const merged = { ...local, ...fixed };
const allKeys = new Set([...KEYS, ...Object.keys(fixed)]);

for (const key of allKeys) {
  const val = merged[key];
  if (!val) continue;
  process.stdout.write(`${key}: "${String(val).replace(/"/g, '\\"')}"\n`);
}
