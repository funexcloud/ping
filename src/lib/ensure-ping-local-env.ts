import fs from "node:fs";
import path from "node:path";

let loaded = false;

/** `scripts/load-local-env.js` 와 동일 규칙 — Next 번들에서 CJS require 없이 동작 */
export function ensurePingLocalEnv(): void {
  if (loaded) return;
  loaded = true;
  const rootDir = process.cwd();
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (
      key &&
      (process.env[key] === undefined || process.env[key] === "")
    ) {
      process.env[key] = val;
    }
  }
}
