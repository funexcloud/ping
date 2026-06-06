/**
 * 레거시 HTML 스냅샷 — repo `legacy-html/` 또는 기존 스냅샷을 저장소 밖으로 복사.
 *
 *   npm run archive:legacy-html
 *   PING_LEGACY_HTML_EXPORT=D:\\backup\\ping-html node scripts/export-legacy-html-snapshot.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveLegacyHtmlArchiveRoot } = require("./legacy-html-archive-path.cjs");

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const legacyRoot = path.join(root, "legacy-html");
const sourceRoot = fs.existsSync(legacyRoot)
  ? legacyRoot
  : resolveLegacyHtmlArchiveRoot(root);

const destBase =
  process.env.PING_LEGACY_HTML_EXPORT?.trim() ||
  path.join(root, "..", "ping_mobile_legacy_html_snapshot");

const DIRS = ["obituary", "legal", "send", "admin"];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDirRecursive(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(dstDir);
  for (const name of fs.readdirSync(srcDir)) {
    const s = path.join(srcDir, name);
    const d = path.join(dstDir, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) {
      copyDirRecursive(s, d);
    } else if (name.endsWith(".html")) {
      copyFile(s, d);
    }
  }
}

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const out = path.join(destBase, stamp);
ensureDir(out);

let count = 0;
for (const name of fs.readdirSync(sourceRoot)) {
  const full = path.join(sourceRoot, name);
  try {
    if (fs.statSync(full).isFile() && name.endsWith(".html")) {
      copyFile(full, path.join(out, name));
      count++;
    }
  } catch {
    /* ignore */
  }
}

for (const dir of DIRS) {
  const src = path.join(sourceRoot, dir);
  if (fs.existsSync(src)) {
    copyDirRecursive(src, path.join(out, dir));
  }
}

ensureDir(destBase);
fs.writeFileSync(path.join(destBase, "LATEST.txt"), stamp + "\n", "utf8");

console.log(
  `[archive:legacy-html] snapshot written to:\n  ${out}\n  (source: ${sourceRoot})\n  (top-level .html count: ${count}; subdirs: ${DIRS.join(", ")})`,
);
console.log(
  `[archive:legacy-html] LATEST.txt → ${stamp}\n  override base: PING_LEGACY_HTML_EXPORT=(dir) — default: ${destBase}`,
);
