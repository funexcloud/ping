/**
 * Next dev/build용 public — `assets/` 링크 + Google 검증 HTML 만 동기화.
 * 화면 HTML 은 App Router; 레거시 원본은 repo 밖 스냅샷 (`npm run archive:legacy-html`).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const pub = path.join(root, "public");
const srcAssets = path.join(root, "assets");
const dstAssets = path.join(pub, "assets");

try {
  execFileSync(process.execPath, [path.join(root, "scripts", "prune-legacy-html-copies.mjs")], {
    cwd: root,
    stdio: "inherit",
  });
  execFileSync(process.execPath, [path.join(root, "scripts", "materialize-legacy-html.mjs")], {
    cwd: root,
    stdio: "inherit",
  });
} catch {
  console.error(
    "[ensure-next-public-static] prune/materialize failed — fix repo-root google verification HTML or run scripts manually",
  );
  process.exit(1);
}

fs.mkdirSync(pub, { recursive: true });

function forceRemovePath(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
}

function linkOrCopyAssetsDir() {
  if (!fs.existsSync(srcAssets) || !fs.statSync(srcAssets).isDirectory()) {
    console.warn("[ensure-next-public-static] skip assets: missing root assets/");
    return;
  }
  forceRemovePath(dstAssets);

  const useCopy =
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV != null ||
    process.env.PING_ASSETS_COPY === "1";

  if (useCopy) {
    forceRemovePath(dstAssets);
    fs.cpSync(srcAssets, dstAssets, { recursive: true, force: true });
    return;
  }

  try {
    if (process.platform === "win32") {
      fs.symlinkSync(srcAssets, dstAssets, "junction");
    } else {
      const rel = path.relative(pub, srcAssets);
      fs.symlinkSync(rel, dstAssets, "dir");
    }
  } catch (e) {
    console.warn(
      "[ensure-next-public-static] symlink assets failed, copying:",
      e instanceof Error ? e.message : e,
    );
    forceRemovePath(dstAssets);
    fs.cpSync(srcAssets, dstAssets, { recursive: true, force: true });
  }
}

const logo = path.join(root, "ping_logo_svg.svg");
if (fs.existsSync(logo)) {
  fs.copyFileSync(logo, path.join(pub, "ping_logo_svg.svg"));
}

const canonicalLogoSrc = [
  path.join(root, "docs", "references", "ping-brand", "ping-app-logo-canonical.png"),
  path.join(root, "references", "ping-app-logo-canonical.png.png"),
].find((p) => fs.existsSync(p));
if (canonicalLogoSrc) {
  const canonicalDir = path.join(pub, "brand", "ping");
  fs.mkdirSync(canonicalDir, { recursive: true });
  fs.copyFileSync(canonicalLogoSrc, path.join(canonicalDir, "ping-app-logo-canonical.png"));
}

linkOrCopyAssetsDir();
console.log("[ensure-next-public-static] OK (assets + verification HTML only)");
