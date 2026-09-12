/**
 * Next dev — HMR용 환경변수 설정 후 기동
 * - PING_SKIP_NEXT_ENSURE: next.config 로드 시 public/materialize 생략(재시작·캐시 꼬임 방지)
 * - WATCHPACK_POLLING: Windows 등에서 파일 변경 감지
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.PING_SKIP_NEXT_ENSURE = "1";
process.env.WATCHPACK_POLLING = "true";
process.env.CHOKIDAR_USEPOLLING = "true";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
spawnSync(process.execPath, [path.join(root, "scripts/ensure-next-public-static.mjs")], {
  cwd: root,
  stdio: "inherit",
});

const requireCjs = createRequire(import.meta.url);
const { preferredLanIpv4 } = requireCjs("../lib/ping-dev-lan.cjs");

const port = process.env.NEXT_DEV_PORT || process.env.PORT_NEXT || "3002";
const lanIp = String(preferredLanIpv4() || "").trim();
if (lanIp) {
  const lanOrigin = `http://${lanIp}:${port}`;
  const extra = String(process.env.PING_DEV_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!extra.includes(lanOrigin)) extra.push(lanOrigin);
  process.env.PING_DEV_ORIGINS = extra.join(",");
  console.log(`[next:dev] phone QR origin: ${lanOrigin}`);
  const [a, b] = lanIp.split(".").map(Number);
  const privateLan = a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
  if (!privateLan) {
    console.warn("[next:dev] QR uses a public NIC IP. Allow inbound TCP " + port + " in Windows Firewall, then stop the server after testing.");
  }
} else {
  console.log("[next:dev] no reachable IPv4 — phone QR will still point at 127.0.0.1");
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const child = spawn(npx, ["next", "dev", "-H", "0.0.0.0", "-p", port, "--turbopack"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
