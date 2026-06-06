#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let s = fs.readFileSync(path.join(root, "lib/bugo-funeral-parse.cjs"), "utf8");
s = s.replace(/^'use strict';\r?\n/, "");
s = s.replace(/\/\*\* @generated[\s\S]*?\*\/\r?\n/, "");
s = s.replace(
  "const cheerio = require('cheerio');",
  "import * as cheerio from 'cheerio';",
);
s = s.replace(/module\.exports = \{[\s\S]*$/, "");

const header = `/**
 * 부고 HTML·모두부고 API → 구조화 데이터.
 * 서버 런타임: lib/bugo-funeral-parse.cjs (npm run build:bugo-parse 로 동기화)
 * 회귀: node scripts/test-bugo-import-parse.cjs
 */

export type ParsedFuneralMourner = { role: string; namesLine: string };

export type ParsedFuneralData = {
  deceasedName: string;
  deceasedAgeGender: string | null;
  mourners: ParsedFuneralMourner[];
  ipgwan: string;
  bainil: string;
  funeralHall: string;
  jangji1: string;
  jangji2: string | null;
};

`;

const footer = `
export {
  parseFuneralPageHtml,
  parseModubugoApiBody,
  formatIsoDateTimeForBugoTemplate,
};
`;

const out = path.join(root, "src/lib/bugo-funeral-parse.ts");
fs.writeFileSync(out, header + s + footer);
console.log("wrote", out);
