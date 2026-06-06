/**
 * Stale `.next` can leave `webpack-runtime.js` out of sync with chunk paths
 * (e.g. Cannot find module './611.js'). Remove and rebuild.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const nextDir = path.join(root, ".next");
fs.rmSync(nextDir, { recursive: true, force: true });
console.log("[clean-next] removed .next");
