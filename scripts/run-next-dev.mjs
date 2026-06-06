/**
 * Next dev — HMR용 환경변수 설정 후 기동
 * - PING_SKIP_NEXT_ENSURE: next.config 로드 시 public/materialize 생략(재시작·캐시 꼬임 방지)
 * - WATCHPACK_POLLING: Windows 등에서 파일 변경 감지
 */
import { spawn } from "node:child_process";

process.env.PING_SKIP_NEXT_ENSURE = "1";
process.env.WATCHPACK_POLLING = "true";
process.env.CHOKIDAR_USEPOLLING = "true";

const port = process.env.NEXT_DEV_PORT || process.env.PORT_NEXT || "3002";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const child = spawn(npx, ["next", "dev", "-p", port], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
