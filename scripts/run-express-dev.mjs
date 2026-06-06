/**
 * Express dev — legacy HTML materialize 생략(Next HMR 과 public 변경 충돌 방지)
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.PING_DEV_LIGHT = "1";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn(process.execPath, [path.join(root, "server.js")], {
  stdio: "inherit",
  env: process.env,
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
