/**
 * repo 밖 레거시 HTML 스냅샷 경로 — `npm run archive:legacy-html` 산출물.
 * generate-* 스크립트·재아카이브용.
 */
const fs = require("node:fs");
const path = require("node:path");

function listSnapshotDirs(base) {
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}/.test(d.name))
    .map((d) => d.name)
    .sort()
    .reverse();
}

/** @param {string} repoRoot */
function resolveLegacyHtmlArchiveRoot(repoRoot) {
  const destBase =
    process.env.PING_LEGACY_HTML_EXPORT?.trim() ||
    path.join(repoRoot, "..", "ping_mobile_legacy_html_snapshot");

  const latestFile = path.join(destBase, "LATEST.txt");
  if (fs.existsSync(latestFile)) {
    const name = fs.readFileSync(latestFile, "utf8").trim();
    const p = path.join(destBase, name);
    if (name && fs.existsSync(p)) return p;
  }

  const dirs = listSnapshotDirs(destBase);
  if (dirs.length) return path.join(destBase, dirs[0]);

  const inRepo = path.join(repoRoot, "legacy-html");
  if (fs.existsSync(inRepo)) return inRepo;

  throw new Error(
    `[legacy-html-archive] no snapshot under ${destBase} — run: npm run archive:legacy-html`,
  );
}

module.exports = { resolveLegacyHtmlArchiveRoot, listSnapshotDirs };
