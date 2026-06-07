#!/usr/bin/env node
/**
 * GitHub 저장소 Description·About 설정 (1회 또는 CI에서 실행)
 *
 * 필요: GITHUB_TOKEN (repo 권한) 또는 gh auth login
 *
 *   GITHUB_TOKEN=ghp_... node scripts/set-github-repo-description.mjs
 *   node scripts/set-github-repo-description.mjs --owner funexcloud --repo ping
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const descPath = path.join(root, ".github", "repository-description.txt");

function parseArgs(argv) {
  const out = { owner: "funexcloud", repo: "ping" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--owner" && argv[i + 1]) out.owner = argv[++i];
    else if (argv[i] === "--repo" && argv[i + 1]) out.repo = argv[++i];
  }
  return out;
}

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.error(
      "GITHUB_TOKEN(또는 GH_TOKEN)이 없습니다.\n" +
        "GitHub → Settings → Developer settings → Personal access tokens 에서 repo 권한 토큰 발급 후:\n" +
        "  GITHUB_TOKEN=... node scripts/set-github-repo-description.mjs\n\n" +
        "또는 웹에서 수동 설정:\n" +
        "  About → Description 에 .github/repository-description.txt 내용 붙여넣기",
    );
    process.exit(1);
  }

  const { owner, repo } = parseArgs(process.argv);
  const description = fs.readFileSync(descPath, "utf8").trim().split("\n")[0].trim();

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description,
      homepage: "https://ping.funexcloud.com",
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("GitHub API 실패:", res.status, body.message || body);
    process.exit(1);
  }

  console.log("OK — description:", body.description);
  console.log("OK — homepage:", body.homepage);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
