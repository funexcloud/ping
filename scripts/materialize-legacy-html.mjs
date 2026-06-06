/**
 * 배포·로컬에 필요한 **정적 HTML만** 동기화 (Google Search Console 검증 등).
 * 화면 본문은 App Router — 레거시 HTML 원본은 repo 밖 스냅샷(`npm run archive:legacy-html`).
 *
 *   npm run materialize:legacy-html
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { KEEP_HTML_BASENAMES } = require("./ping-legacy-html-redirects.cjs");

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");

function sleepSync(ms) {
  const t = Date.now() + ms;
  while (Date.now() < t) {
    /* spin */
  }
}

function copyFileSyncRobust(src, dst) {
  const attempts = 8;
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      fs.copyFileSync(src, dst);
      return;
    } catch (e) {
      lastErr = e;
      try {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.writeFileSync(dst, fs.readFileSync(src));
        return;
      } catch (e2) {
        lastErr = e2;
        if (i < attempts - 1) sleepSync(30 * (i + 1));
      }
    }
  }
  throw lastErr;
}

function materialize() {
  let count = 0;
  for (const name of KEEP_HTML_BASENAMES) {
    const src = path.join(root, name);
    if (!fs.existsSync(src)) {
      console.warn(`[materialize-legacy-html] skip — missing at repo root: ${name}`);
      continue;
    }
    copyFileSyncRobust(src, path.join(root, name));
    copyFileSyncRobust(src, path.join(root, "public", name));
    count++;
  }
  console.log(
    `[materialize-legacy-html] OK (${count} verification/static HTML → root + public/)`,
  );
}

materialize();
