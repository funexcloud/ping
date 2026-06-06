#!/usr/bin/env node
/**
 * src/lib/bugo-funeral-parse.ts → lib/bugo-funeral-parse.cjs (Node require용)
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "src/lib/bugo-funeral-parse.ts");
const outfile = path.join(root, "lib/bugo-funeral-parse.cjs");

const r = spawnSync(
  "npx",
  [
    "--yes",
    "esbuild",
    entry,
    "--bundle",
    "--platform=node",
    "--format=cjs",
    `--outfile=${outfile}`,
    "--packages=external",
  ],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);

if (r.status !== 0) process.exit(r.status ?? 1);

const built = fs.readFileSync(outfile, "utf8");
const header =
  "'use strict';\n/** Built from src/lib/bugo-funeral-parse.ts — npm run build:bugo-parse */\n";
fs.writeFileSync(outfile, header + built);
console.log("built", outfile);
