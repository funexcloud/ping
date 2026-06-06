#!/usr/bin/env node
/** 프로덕션 핸드오프 스모크 — `node scripts/verify-production-handoff.mjs` */
const ORIGIN = (process.env.PING_VERIFY_ORIGIN || "https://ping.funexcloud.com").replace(
  /\/+$/,
  "",
);

let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log("OK", name);
  } catch (e) {
    failed += 1;
    console.error("FAIL", name, "-", e instanceof Error ? e.message : e);
  }
}

await check("GET /", async () => {
  const r = await fetch(`${ORIGIN}/`);
  if (!r.ok) throw new Error(`status ${r.status}`);
});

await check("GET /start", async () => {
  const r = await fetch(`${ORIGIN}/start`);
  if (!r.ok) throw new Error(`status ${r.status}`);
});

await check("redirect /index.html → /start", async () => {
  const r = await fetch(`${ORIGIN}/index.html`, { redirect: "manual" });
  if (![301, 308, 307].includes(r.status)) throw new Error(`status ${r.status}`);
  const loc = r.headers.get("location") || "";
  if (!loc.includes("/start")) throw new Error(`location ${loc}`);
});

await check("GET /api/getOrderStatus (Firebase proxy)", async () => {
  const r = await fetch(`${ORIGIN}/api/getOrderStatus?orderId=test`);
  const body = await r.text();
  if (r.status === 502 || body.includes("express_unreachable")) {
    throw new Error("502 — set PING_BACKEND_API_ORIGIN on Vercel and redeploy");
  }
  if (r.status === 404 && body.includes("Order not found")) return;
  if (r.status === 200) return;
  throw new Error(`status ${r.status} body=${body.slice(0, 120)}`);
});

await check("GET /api/ping-config-portone.js", async () => {
  const r = await fetch(`${ORIGIN}/api/ping-config-portone`);
  if (!r.ok) throw new Error(`status ${r.status}`);
  const t = await r.text();
  if (!t.includes("__PING_PORTONE_CONFIG__")) throw new Error("missing config global");
});

await check("GET /api/auth/kakao/config (Express proxy)", async () => {
  const r = await fetch(`${ORIGIN}/api/auth/kakao/config`);
  const body = await r.text();
  if (r.status === 502 || body.includes("express_unreachable")) {
    throw new Error("502 — set PING_EXPRESS_ORIGIN on Vercel and redeploy");
  }
  if (!r.ok) throw new Error(`status ${r.status} body=${body.slice(0, 120)}`);
});

await check("GET /api/guest-auth/config (Express proxy)", async () => {
  const r = await fetch(`${ORIGIN}/api/guest-auth/config`);
  const body = await r.text();
  if (r.status === 502 || body.includes("express_unreachable")) {
    throw new Error("502 — guest-auth needs PING_EXPRESS_ORIGIN");
  }
  if (!r.ok) throw new Error(`status ${r.status} body=${body.slice(0, 120)}`);
});

if (failed) process.exit(1);
console.log(`\nProduction handoff verify OK (${ORIGIN})`);
