#!/usr/bin/env node
/**
 * dev 포트(3000 Express, 3002 Next) 점유 프로세스 종료 — Windows·Unix
 * npm run dev:clean 전에 실행
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ports = [
  Number(process.env.PORT) || 3000,
  Number(process.env.NEXT_DEV_PORT) || Number(process.env.PORT_NEXT) || 3002,
];

function killPort(port) {
  if (process.platform === "win32") {
    const r = spawnSync("netstat", ["-ano"], { encoding: "utf8", shell: true });
    const lines = String(r.stdout || "").split(/\r?\n/);
    const pids = new Set();
    for (const line of lines) {
      if (!line.includes(`:${port}`) || !line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      spawnSync("taskkill", ["/F", "/PID", pid], { stdio: "inherit", shell: true });
      console.log(`[kill-dev-ports] killed PID ${pid} on :${port}`);
    }
    return;
  }
  spawnSync("bash", ["-lc", `lsof -ti:${port} | xargs -r kill -9 2>/dev/null || true`], {
    stdio: "inherit",
  });
}

for (const p of ports) killPort(p);
console.log("[kill-dev-ports] done");
