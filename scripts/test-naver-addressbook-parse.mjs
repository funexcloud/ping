/**
 * Node parity tests for Naver / address book file parsing in index.html —
 * VCARD helpers, CSV·XLSX via SheetJS (codepage 949 for NAVER CSV), phone column
 * detection, row extraction. No browser/DOM.
 *
 * Logic duplicated from index.html (keep in sync when changing production).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(__dirname, '..', 'tests', 'fixtures');

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

/* ---- index.html copies ---- */
function normalizeKoreanPhoneForSms(raw) {
  if (raw == null || raw === '') return null;
  let d = String(raw).replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('82') && d.length >= 10) d = '0' + d.slice(2);
  if (d.length < 10 || d.length > 12) return null;
  if (!d.startsWith('0')) return null;
  return d;
}

function indexStripNaverCsvCell(raw) {
  return String(raw ?? '')
    .replace(/^[\s\u2018\u2019'"]+|[\s\u2018\u2019'"]+$/g, '')
    .trim();
}

function indexDisplayNameFromAddressRow(row, nameKey) {
  const seong = row && row['성'] != null ? indexStripNaverCsvCell(row['성']) : '';
  const given = nameKey && row[nameKey] != null ? indexStripNaverCsvCell(row[nameKey]) : '';
  if (seong && given) return (seong + ' ' + given).trim();
  if (given) return given;
  if (seong) return seong;
  return '';
}

function extractPhoneRowsFromSheet(jsonData, phoneKey, nameKey) {
  const rows = [];
  const seen = new Set();
  if (!Array.isArray(jsonData) || !phoneKey) return rows;
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const n = normalizeKoreanPhoneForSms(row[phoneKey]);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    let label = n;
    const displayName = indexDisplayNameFromAddressRow(row, nameKey);
    if (displayName) {
      label = displayName + ' · ' + n;
    }
    rows.push({ phone: n, label });
  }
  return rows;
}

function indexFoldVcardPhysicalLines(text) {
  var lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (/^[ \t]/.test(line) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function indexUnescapeVcardValue(v) {
  return String(v || '')
    .replace(/\\\\/g, '\0ESC\0')
    .replace(/\\n/g, '\n')
    .replace(/\\N/g, '\n')
    .replace(/\\;/g, ';')
    .replace(/\\,/g, ',')
    .replace(/\0ESC\0/g, '\\')
    .trim();
}

function indexVcardPropName(propPartUpper) {
  var key = String(propPartUpper || '').split(';')[0];
  var dot = key.lastIndexOf('.');
  return (dot >= 0 ? key.slice(dot + 1) : key).toUpperCase();
}

function indexParseVcardTextToRows(text) {
  var rows = [];
  var seen = new Set();
  var re = /BEGIN:VCARD[\s\S]*?END:VCARD/gi;
  var blocks = [];
  var m;
  while ((m = re.exec(text)) !== null) blocks.push(m[0]);
  if (blocks.length === 0 && /^(?:FN|TEL|N);/im.test(String(text || '').trim())) {
    blocks.push(text);
  }
  for (var b = 0; b < blocks.length; b++) {
    var lines = indexFoldVcardPhysicalLines(blocks[b]);
    var fn = '';
    var nFamily = '';
    var nGiven = '';
    var tels = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var tline = line.trim();
      if (!tline || /^BEGIN:VCARD|^END:VCARD|^VERSION:/i.test(tline)) continue;
      var colon = line.indexOf(':');
      if (colon < 0) continue;
      var propPart = line.slice(0, colon);
      var rawVal = line.slice(colon + 1);
      var pname = indexVcardPropName(propPart);
      if (pname === 'FN') {
        fn = indexUnescapeVcardValue(rawVal);
      } else if (pname === 'N') {
        var nv = indexUnescapeVcardValue(rawVal);
        var np = nv.split(';');
        nFamily = String(np[0] || '').trim();
        nGiven = String(np[1] || '').trim();
      } else if (pname === 'TEL') {
        var tv = indexUnescapeVcardValue(rawVal).replace(/^tel:/i, '').trim();
        if (tv) tels.push(tv);
      }
    }
    var displayName = (fn || '').trim();
    if (!displayName) {
      displayName = [nFamily, nGiven].filter(Boolean).join(' ').trim();
    }
    for (var j = 0; j < tels.length; j++) {
      var n = normalizeKoreanPhoneForSms(tels[j]);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      rows.push({ phone: n, label: displayName ? displayName + ' · ' + n : n });
    }
  }
  return rows;
}

function indexIsVcardUpload(file, originalLowerName) {
  var name = String(originalLowerName || '').toLowerCase();
  if (name.endsWith('.vcf') || name.endsWith('.vcard')) return true;
  var t = String(file && file.type ? file.type : '').toLowerCase();
  if (t === 'text/vcard' || t === 'text/x-vcard') return true;
  if (t === 'text/directory' && (name.endsWith('.vcf') || name.endsWith('.vcard'))) return true;
  return false;
}

/** Mirrors analyzeFile() sheet branch: first row keys → phone column. */
function findPhoneColumnKey(firstRowKeys) {
  return firstRowKeys.find((key) => {
    const k = String(key || '').trim();
    return (
      k.includes('휴대폰') ||
      k.includes('휴대전화') ||
      k.includes('휴대폰번호') ||
      k.includes('Mobile') ||
      k.toLowerCase().includes('phone') ||
      k === '전화번호'
    );
  });
}

function findNameColumnKey(firstRowKeys) {
  return firstRowKeys.find((key) =>
    /이름|성명|표시\s*이름|표시이름|고객명|성함|닉네임|별명|연락처\s*별칭|^name$|display\s*name/i.test(String(key || '').trim())
  );
}

/**
 * Same read strategy as analyzeFile for tabular data: CP949 for CSV path
 * (extension or NAVER-style name), else array read for xlsx.
 */
function readWorkbookFromFileBytes(buf, originalFileName) {
  const lower = (originalFileName || '').toLowerCase();
  const isCSV =
    lower.endsWith('.csv') || lower.includes('addressbook') || lower.includes('주소록');

  if (isCSV) {
    try {
      return XLSX.read(buf, { type: 'buffer', codepage: 949 });
    } catch (_e) {
      return XLSX.read(buf, { type: 'buffer' });
    }
  }
  return XLSX.read(buf, { type: 'buffer' });
}

function analyzeTabularFixture(buf, originalFileName) {
  const workbook = readWorkbookFromFileBytes(buf, originalFileName);
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(firstSheet);
  if (!jsonData.length) return { phoneKey: null, nameKey: null, jsonData: [], rows: [] };
  const keys = Object.keys(jsonData[0]);
  const phoneKey = findPhoneColumnKey(keys);
  const nameKey = findNameColumnKey(keys);
  const rows = phoneKey ? extractPhoneRowsFromSheet(jsonData, phoneKey, nameKey) : [];
  return { phoneKey, nameKey, jsonData, rows };
}

/* ---- tests ---- */
function run() {
  // 1) indexIsVcardUpload
  assert(indexIsVcardUpload({ type: '' }, 'c.vcf'), 'vcf ext');
  assert(indexIsVcardUpload({ type: 'text/vcard' }, 'noext'), 'mime vcard');
  assert(!indexIsVcardUpload({ type: 'text/csv' }, 'x.csv'), 'not vcard csv');
  assert(
    indexIsVcardUpload({ type: 'text/directory' }, 'x.vcf'),
    'text/directory + vcf'
  );

  // 2) NAVER CP949 CSV fixture (simulate filename triggering CP949 branch)
  const cp949Csv = fs.readFileSync(path.join(FIX, 'naver-cp949-snippet.csv'));
  const tab1 = analyzeTabularFixture(cp949Csv, 'NAVER_addressbook_export.csv');
  assert(tab1.phoneKey && tab1.phoneKey.includes('휴대'), 'cp949 phone key');
  assert(tab1.rows.length === 2, `cp949 row count ${tab1.rows.length}`);
  const phs = tab1.rows.map((r) => r.phone).sort();
  assert(phs[0] === '01022223333' && phs[1] === '01091919292', `phones ${phs}`);
  assert(tab1.rows.some((r) => r.label.includes('이 영희')), '성+이름 label');

  // 3) XLSX — English "Mobile" header + 82… normalization
  const xlsxBuf = fs.readFileSync(path.join(FIX, 'spreadsheet-snippet.xlsx'));
  const tab2 = analyzeTabularFixture(xlsxBuf, 'export.xlsx');
  assert(tab2.phoneKey === 'Mobile', `xlsx phone key ${tab2.phoneKey}`);
  assert(tab2.rows.length === 2, `xlsx rows ${tab2.rows.length}`);
  const by = Object.fromEntries(tab2.rows.map((r) => [r.phone, r.label]));
  assert(by['01077778888'], 'John row');
  assert(by['010999888777'], '82-prefixed normalized');

  // 4) VCF fixture
  const vcfText = fs.readFileSync(path.join(FIX, 'sample.vcf'), 'utf8');
  const vrows = indexParseVcardTextToRows(vcfText);
  assert(vrows.length === 2, `vcf rows ${vrows.length}`);
  assert(vrows[0].phone === '01011112222' && vrows[0].label.includes('박테스트'), 'vcf fn');
  assert(vrows[1].phone === '01033335555' && vrows[1].label.includes('두번째'), 'vcf n');

  // 5) folded vCard line + duplicate TEL dedupe
  const folded = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:폴드',
    'TEL;TYPE=CELL:010-12',
    ' 34-5678',
    'TEL;TYPE=CELL:01012345678',
    'END:VCARD',
    '',
  ].join('\n');
  const fr = indexParseVcardTextToRows(folded);
  assert(fr.length === 1 && fr[0].phone === '01012345678', 'fold + dup tel');

  // 6) No phone column — alert branch in UI
  // CP949: .csv fixtures use codepage 949 in readWorkbookFromFileBytes (matches index.html NAVER path).
  const noPhoneCsv = iconv.encode('이름,이메일\na,b\n', 'cp949');
  const tab3 = analyzeTabularFixture(noPhoneCsv, 'x.csv');
  assert(tab3.phoneKey === undefined, 'missing phone column');
  assert(tab3.rows.length === 0, 'no rows');

  // 7) UTF-8 string path (what works when buffer is UTF-8 text — dev sanity)
  const utf8Csv = `성,이름,전화번호\n박,ruby,010-8888-9999\n`;
  const wbU = XLSX.read(utf8Csv, { type: 'string' });
  const jU = XLSX.utils.sheet_to_json(wbU.Sheets[wbU.SheetNames[0]]);
  const pk = findPhoneColumnKey(Object.keys(jU[0]));
  assert(pk === '전화번호', pk);
  const rU = extractPhoneRowsFromSheet(jU, pk, findNameColumnKey(Object.keys(jU[0])));
  assert(rU[0].phone === '01088889999', 'utf8 csv');

  console.log('OK — all NAVER address book parse checks passed.');
}

try {
  run();
  process.exitCode = 0;
} catch (e) {
  console.error('FAIL:', e.message || e);
  process.exitCode = 1;
}
