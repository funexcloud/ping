#!/usr/bin/env node
/**
 * docs/wiki/*.md → GitHub Wiki 저장소 푸시
 *
 * 사전 (필수):
 *   1. Settings → Features → Wikis ON
 *   2. Wiki 탭 → Create the first page (한 번 저장) → ping.wiki.git 생성
 *
 *   GITHUB_TOKEN=ghp_... npm run wiki:push
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const wikiSrc = path.join(root, "docs", "wiki");
const WIKI_URL = "https://github.com/funexcloud/ping.wiki.git";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  return r;
}

function copyWikiFiles(destDir) {
  const files = fs.readdirSync(wikiSrc).filter((f) => f.endsWith(".md"));
  for (const f of files) {
    fs.copyFileSync(path.join(wikiSrc, f), path.join(destDir, f));
  }
  return files.length;
}

function printSetupHelp(reason) {
  console.error("\n[wiki:push] 실패:", reason);
  console.error(`
GitHub Wiki는 main 브랜치와 별도 저장소입니다. docs/wiki/ 만 올려서는 /wiki 에 안 보입니다.

필수 순서:
  1. https://github.com/funexcloud/ping/settings → Features → Wikis ✅
  2. https://github.com/funexcloud/ping/wiki → Create the first page (Home 저장)
  3. docs/wiki 를 main 에 push (임시로 tree/main/docs/wiki 에서 읽기)
  4. GITHUB_TOKEN=ghp_<repo권한> npm run wiki:push

자세히: docs/wiki/Wiki-Setup.md
`);
}

function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    printSetupHelp("GITHUB_TOKEN(또는 GH_TOKEN) 없음");
    process.exit(1);
  }

  if (!fs.existsSync(wikiSrc)) {
    printSetupHelp("docs/wiki 없음");
    process.exit(1);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ping-wiki-"));
  const authUrl = WIKI_URL.replace("https://", `https://x-access-token:${token}@`);

  console.log("Cloning", WIKI_URL);
  const clone = run("git", ["clone", authUrl, tmp], { stdio: "inherit" });

  if (clone.status !== 0) {
    printSetupHelp(
      "ping.wiki.git clone 실패 — Wiki 기능 OFF 이거나 'Create the first page' 를 아직 안 했을 수 있음",
    );
    process.exit(1);
  }

  const n = copyWikiFiles(tmp);
  console.log(`Copied ${n} markdown files.`);

  run("git", ["add", "-A"], { cwd: tmp, stdio: "inherit" });
  const status = run("git", ["status", "--porcelain"], { cwd: tmp });
  if (!status.stdout?.trim()) {
    console.log("Wiki already up to date.");
    return;
  }

  run("git", ["commit", "-m", "Sync wiki from docs/wiki"], { cwd: tmp, stdio: "inherit" });
  const push = run("git", ["push", "origin", "HEAD"], { cwd: tmp, stdio: "inherit" });
  if (push.status !== 0) {
    printSetupHelp("push 실패 — 토큰 repo 권한 확인");
    process.exit(1);
  }
  console.log("OK — https://github.com/funexcloud/ping/wiki");
}

main();
