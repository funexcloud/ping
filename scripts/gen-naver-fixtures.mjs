/**
 * One-off / optional: regenerate tests/fixtures for Naver address book parse tests.
 * Run: node scripts/gen-naver-fixtures.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'tests', 'fixtures');
fs.mkdirSync(dir, { recursive: true });

// Hyphenated mobile so CSV stays text (otherwise SheetJS parses 010… as number and drops leading 0).
const csv =
  '성,이름,휴대폰,전화번호,메모\r\n' +
  '이,영희,010-2222-3333,+82 10 3333 4444,\r\n' +
  '김,철수,010-9191-9292,,테스트\r\n';
fs.writeFileSync(path.join(dir, 'naver-cp949-snippet.csv'), iconv.encode(csv, 'cp949'));

const vcf =
  'BEGIN:VCARD\r\n' +
  'VERSION:3.0\r\n' +
  'FN:박테스트\r\n' +
  'TEL;TYPE=CELL:01011112222\r\n' +
  'END:VCARD\r\n' +
  'BEGIN:VCARD\r\n' +
  'VERSION:3.0\r\n' +
  'N:두번째;연락;;;\r\n' +
  'TEL:+82-10-3333-5555\r\n' +
  'END:VCARD\r\n';
fs.writeFileSync(path.join(dir, 'sample.vcf'), vcf, 'utf8');

const ws = XLSX.utils.aoa_to_sheet([
  ['이름', '표시 이름', 'Mobile'],
  ['외국', 'John', '01077778888'],
  ['로컬', '한글', '8210999888777'],
]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, path.join(dir, 'spreadsheet-snippet.xlsx'));

console.log('Wrote:', path.join(dir, 'naver-cp949-snippet.csv, sample.vcf, spreadsheet-snippet.xlsx'));
