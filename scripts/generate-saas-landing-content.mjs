/**
 * archive saas-landing.html → src/content/marketing/saas-landing.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveLegacyHtmlArchiveRoot } = require("./legacy-html-archive-path.cjs");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const archiveRoot = resolveLegacyHtmlArchiveRoot(root);
const html = fs.readFileSync(path.join(archiveRoot, "saas-landing.html"), "utf8");
const styles = [];
const styleRe = /<style>([\s\S]*?)<\/style>/gi;
let m;
while ((m = styleRe.exec(html))) styles.push(m[1].trim());
const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
if (!bodyMatch) throw new Error("body not found");
let body = bodyMatch[1].replace(/<script[\s\S]*$/i, "").trim();

const outDir = path.join(root, "src", "content", "marketing");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "saas-landing.ts"),
  `/** @generated — legacy-html/saas-landing.html */\nexport const saasLandingStyles = ${JSON.stringify(styles.join("\n\n"))};\nexport const saasLandingBodyHtml = ${JSON.stringify(body)};\n`,
  "utf8",
);
console.log("[generate-saas-landing-content] OK", body.length, "chars body");
