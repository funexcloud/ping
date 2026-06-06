#!/usr/bin/env node
/**
 * Express API → Google Cloud Run (asia-northeast3)
 *   node scripts/deploy-express-cloud-run.mjs
 *
 * 사전: gcloud auth login && gcloud config set project ping-3a510
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = process.env.GCP_PROJECT || "ping-3a510";
const REGION = process.env.GCP_REGION || "asia-northeast3";
const SERVICE = process.env.PING_EXPRESS_SERVICE || "ping-express-api";
const BUCKET = process.env.PING_MEMBER_GCS_BUCKET || `${PROJECT}-member-auth`;

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    shell: process.platform === "win32",
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runCapture(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd: root,
    shell: process.platform === "win32",
    ...opts,
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  return String(r.stdout || "").trim();
}

const USE_GCS_MEMBER_VOLUME = process.env.PING_EXPRESS_USE_GCS_VOLUME !== "0";

console.log(`[deploy-express] project=${PROJECT} region=${REGION} service=${SERVICE}`);
console.log(`[deploy-express] gcs-volume=${USE_GCS_MEMBER_VOLUME ? "on" : "off"}`);

run("gcloud", ["config", "set", "project", PROJECT]);
run("gcloud", [
  "services",
  "enable",
  "run.googleapis.com",
  "cloudbuild.googleapis.com",
  "artifactregistry.googleapis.com",
  "storage.googleapis.com",
]);

const bucketCheck = spawnSync(
  "gsutil",
  ["ls", "-b", `gs://${BUCKET}`],
  { encoding: "utf8", shell: process.platform === "win32" },
);
if (bucketCheck.status !== 0) {
  console.log(`[deploy-express] creating bucket gs://${BUCKET}`);
  run("gsutil", ["mb", "-l", REGION, `gs://${BUCKET}`]);
}

const envPath = path.join(os.tmpdir(), "ping-express-env.yaml");
const envYaml = runCapture(process.execPath, [
  path.join(root, "scripts", "build-cloud-run-env.mjs"),
], {
  env: {
    ...process.env,
    PING_EXPRESS_USE_GCS_VOLUME: USE_GCS_MEMBER_VOLUME ? "1" : "0",
  },
});
fs.writeFileSync(envPath, envYaml, "utf8");

const deployArgs = [
  "run",
  "deploy",
  SERVICE,
  "--source",
  root,
  "--region",
  REGION,
  "--platform",
  "managed",
  "--allow-unauthenticated",
  "--quiet",
  "--port",
  "8080",
  "--memory",
  "1Gi",
  "--cpu",
  "1",
  "--timeout",
  "300",
  "--min-instances",
  "0",
  "--max-instances",
  "3",
  "--env-vars-file",
  envPath,
  "--command",
  "node",
  "--args",
  "scripts/start-express-cloud-run.cjs",
];

if (USE_GCS_MEMBER_VOLUME) {
  deployArgs.push(
    "--add-volume",
    `name=member-data,type=cloud-storage,bucket=${BUCKET}`,
    "--add-volume-mount",
    "volume=member-data,mount-path=/data",
  );
} else {
  deployArgs.push("--clear-volumes", "--clear-volume-mounts");
  console.log("[deploy-express] PING_EXPRESS_USE_GCS_VOLUME=0 — member data uses /tmp only");
}

run("gcloud", deployArgs);

const url = runCapture("gcloud", [
  "run",
  "services",
  "describe",
  SERVICE,
  "--region",
  REGION,
  "--format",
  "value(status.url)",
]);

const origin = url.replace(/\/+$/, "");
fs.writeFileSync(path.join(root, ".ping-express-origin"), `${origin}\n`, "utf8");
console.log(`\n[deploy-express] OK ${origin}`);
console.log("Next: npm run sync:vercel-env && npx vercel@latest deploy --prod --yes");
