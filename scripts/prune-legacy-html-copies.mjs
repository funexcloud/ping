/**
 * materialize 로 루트·public·하위에 쌓인 이관 완료 HTML 을 제거합니다.
 *
 *   node scripts/prune-legacy-html-copies.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { KEEP_HTML_BASENAMES, PRUNE_HTML_BASENAMES, PRUNE_HTML_DIRS } = require(
  "./ping-legacy-html-redirects.cjs",
);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");

function removeFile(p) {
  if (!fs.existsSync(p)) return false;
  try {
    fs.unlinkSync(p);
    return true;
  } catch {
    return false;
  }
}

function pruneDirHtml(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      n += pruneDirHtml(full);
    } else if (name.endsWith(".html") && !KEEP_HTML_BASENAMES.has(name)) {
      if (removeFile(full)) n++;
    }
  }
  return n;
}

function pruneRootHtml(baseDir) {
  if (!fs.existsSync(baseDir)) return 0;
  let n = 0;
  for (const name of fs.readdirSync(baseDir)) {
    if (!name.endsWith(".html")) continue;
    if (KEEP_HTML_BASENAMES.has(name)) continue;
    if (PRUNE_HTML_BASENAMES.has(name) && removeFile(path.join(baseDir, name))) n++;
  }
  return n;
}

function pruneSubdirs(baseDir) {
  let n = 0;
  for (const dir of PRUNE_HTML_DIRS) {
    const full = path.join(baseDir, dir);
    if (!fs.existsSync(full)) continue;
    n += pruneDirHtml(full);
    try {
      if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
    } catch {
      /* ignore */
    }
  }
  return n;
}

let total = 0;
total += pruneRootHtml(root);
total += pruneSubdirs(root);
total += pruneRootHtml(pub);
total += pruneSubdirs(pub);

console.log(`[prune-legacy-html-copies] removed ${total} stale HTML file(s) under root/ and public/`);
