#!/usr/bin/env node
/**
 * Phase 1 점검 실행 — 로컬 dev(3002) + 터미널 로그 + API 스모크
 * node scripts/run-phase1-verify.mjs
 * node scripts/run-phase1-verify.mjs --order-id zytsCb1y47EsWXtfDexS --amount 110
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const vercelEnv = path.join(root, ".env.vercel.pull");
if (fs.existsSync(vercelEnv)) {
  for (const line of fs.readFileSync(vercelEnv, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (
      key === "FIREBASE_SERVICE_ACCOUNT_JSON" &&
      !process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ) {
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = t.slice(eq + 1).trim();
    }
  }
}
const base = (process.env.PING_VERIFY_BASE || "http://localhost:3002").replace(/\/$/, "");
const orderId = process.argv.includes("--order-id")
  ? process.argv[process.argv.indexOf("--order-id") + 1]
  : "zytsCb1y47EsWXtfDexS";
const amount = process.argv.includes("--amount")
  ? Number(process.argv[process.argv.indexOf("--amount") + 1])
  : 110;

const lines = [];
function ok(msg) {
  lines.push(`OK  ${msg}`);
}
function fail(msg) {
  lines.push(`FAIL ${msg}`);
}
function info(msg) {
  lines.push(`    ${msg}`);
}

/** checkout redirect URL 규칙 */
function buildPaymentSuccessUrl(oid, amt, bank) {
  const u = new URL("/payment-success", base);
  u.searchParams.set("orderId", oid);
  u.searchParams.set("amount", String(amt));
  if (bank) u.searchParams.set("bank_transfer", "1");
  return u.pathname + u.search;
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

// --- 1) URL 규칙
const bankUrl = buildPaymentSuccessUrl(orderId, amount, true);
if (bankUrl.includes("bank_transfer=1") && bankUrl.includes(orderId)) {
  ok(`무통장 redirect URL: ${bankUrl}`);
} else {
  fail(`무통장 URL에 bank_transfer=1 없음: ${bankUrl}`);
}

// --- 터미널 로그에서 실제 GET 확인
const terminalsDir = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cursor",
  "projects",
  "d-USER-ping-mobile",
  "terminals",
);
if (fs.existsSync(terminalsDir)) {
  let foundLog = false;
  for (const f of fs.readdirSync(terminalsDir)) {
    if (!f.endsWith(".txt")) continue;
    const t = fs.readFileSync(path.join(terminalsDir, f), "utf8");
    if (
      t.includes(`orderId=${orderId}`) &&
      t.includes("bank_transfer=1") &&
      t.includes("/payment-success")
    ) {
      foundLog = true;
      ok(`dev 서버 로그: payment-success + bank_transfer=1 (${f})`);
      if (t.includes("bank transfer Firestore update failed")) {
        info("로그: Firestore Admin 없음 → waiting_bank_transfer 미반영 (로컬)");
      }
      break;
    }
  }
  if (!foundLog) {
    info("터미널 로그에 해당 orderId 무통장 GET 없음 — 직접 무통장 한 번 더 필요");
  }
}

// --- 2) Firestore status API
let statusReachable = false;
try {
  const st = await fetchJson(
    `${base}/api/orders/${encodeURIComponent(orderId)}/status?amount=${amount}`,
  );
  statusReachable = true;
  if (st.status === 200 && st.body.ok) {
    ok(`Firestore status: ${st.body.status} / ${st.body.paymentMethod || "-"} / sms=${st.body.smsStatus || "-"}`);
    if (st.body.status === "waiting_bank_transfer") {
      ok("무통장 Firestore 상태 정상");
    } else if (st.body.status === "waiting_payment") {
      fail("아직 waiting_payment — 서버 무통장 반영 안 됨 (Admin 키 필요)");
    }
  } else if (st.body.error === "no_admin_db" || st.status >= 500) {
    fail(`status API: Admin DB 없음 (http ${st.status}) — FIREBASE_SERVICE_ACCOUNT_JSON 설정 필요`);
  } else {
    info(`status API http ${st.status}: ${JSON.stringify(st.body)}`);
  }
} catch (e) {
  fail(`status API 연결 실패 (${base}) — npm run dev 실행 중인지 확인`);
  info(String(e.message || e));
}

// --- 3) 카드 mock finalize + dispatch
process.env.PING_TOSS_CONFIRM_MOCK = "1";
process.env.PING_DISPATCH_USE_SOLAPI = process.env.PING_DISPATCH_USE_SOLAPI || "1";

const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url);
require(path.join(root, "scripts/load-local-env.js")).loadPingLocalEnv(root);
const pingToss = require(path.join(root, "ping-toss-checkout-api.js"));

pingToss.setCheckoutSession(orderId, amount);
const confirm = await pingToss.apiConfirmTossPayment({
  paymentKey: `phase1_verify_${Date.now()}`,
  orderId,
  amount,
  orderTotal: amount,
  pointsUsed: 0,
  deviceId: "",
  referralCode: "",
});

if (confirm.status === 200 && confirm.body.success) {
  ok("mock 카드 confirm API 200");
  const fin = confirm.body.finalize;
  if (fin?.paid) {
    ok("finalize.paid=true");
  } else {
    fail("finalize.paid 없음");
  }
  if (fin?.dispatch?.ok) {
    ok("finalize.dispatch.ok — sendSMSAutomation/Solapi 경로 호출됨");
  } else {
    fail(`finalize.dispatch 실패: ${fin?.dispatch?.error || "unknown"}`);
    info("SOLAPI 키·주문 연락처·Firestore Admin 확인");
  }
} else if (confirm.status === 500 && String(confirm.body.error || "").includes("주문 확정")) {
  fail(`mock confirm: Firestore Admin 없음 — ${confirm.body.error}`);
} else {
  fail(`mock confirm http ${confirm.status}: ${JSON.stringify(confirm.body)}`);
}

// --- bank-transfer API: Firestore 실패 시 503 (Phase 1)
const bankRes = await fetchJson(`${base}/api/checkout/bank-transfer`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orderId,
    orderTotal: amount,
    pointsUsed: 0,
    bankTransferAmount: amount,
    deviceId: "",
    cashReceiptType: "income_deduction",
    cashReceiptNumber: "",
    cashReceiptVoluntary: true,
  }),
});
pingToss.setCheckoutSession(orderId, amount);
if (statusReachable) {
  if (bankRes.status === 503) {
    ok("무통장 API: Firestore 실패 시 503 (Phase 1 — 클라이언트에 성공 숨기지 않음)");
  } else if (bankRes.status === 200) {
    info(`무통장 API 200 — Admin 설정됨 또는 이전 빌드`);
  } else {
    info(`무통장 API http ${bankRes.status}`);
  }
}

console.log("\n=== Phase 1 점검 결과 ===\n");
console.log(lines.join("\n"));
const fails = lines.filter((l) => l.startsWith("FAIL")).length;
process.exit(fails > 0 ? 1 : 0);
