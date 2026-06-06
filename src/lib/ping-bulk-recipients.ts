/**
 * 대량 발송 수신자 — `legacy-html/index.html` 주소록 파싱·정규화 규칙과 동일.
 */
import * as XLSX from "xlsx";

export type BulkRecipientRow = {
  phone: string;
  label: string;
  name?: string;
};

export function normalizeKoreanPhoneForSms(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  let d = String(raw).replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("82") && d.length >= 10) d = `0${d.slice(2)}`;
  if (d.length < 10 || d.length > 12) return null;
  if (!d.startsWith("0")) return null;
  return d;
}

export function normalizeBulkRecipient(raw: unknown): BulkRecipientRow {
  if (raw == null) return { phone: "", label: "" };
  if (typeof raw === "string") {
    const s = String(raw).trim();
    return { phone: s, label: s };
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const ph = String(o.phone || o.tel || o.mobile || "").trim();
    let lab = o.label != null ? String(o.label).trim() : "";
    if (!lab) lab = ph;
    const nm = o.name != null ? String(o.name).trim() : "";
    const out: BulkRecipientRow = { phone: ph || lab, label: lab || ph };
    if (nm) out.name = nm;
    return out;
  }
  const t = String(raw).trim();
  return { phone: t, label: t };
}

function stripNaverCsvCell(raw: unknown): string {
  return String(raw ?? "")
    .replace(/^[\s\u2018\u2019'"]+|[\s\u2018\u2019'"]+$/g, "")
    .trim();
}

function displayNameFromAddressRow(
  row: Record<string, unknown>,
  nameKey: string | undefined,
): string {
  const seong = row["성"] != null ? stripNaverCsvCell(row["성"]) : "";
  const given =
    nameKey && row[nameKey] != null ? stripNaverCsvCell(row[nameKey]) : "";
  if (seong && given) return `${seong} ${given}`.trim();
  if (given) return given;
  if (seong) return seong;
  return "";
}

function extractPhoneRowsFromSheet(
  jsonData: Record<string, unknown>[],
  phoneKey: string,
  nameKey: string | undefined,
): BulkRecipientRow[] {
  const rows: BulkRecipientRow[] = [];
  const seen = new Set<string>();
  for (const row of jsonData) {
    const n = normalizeKoreanPhoneForSms(row[phoneKey]);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    let label = n;
    const displayName = displayNameFromAddressRow(row, nameKey);
    if (displayName) label = `${displayName} · ${n}`;
    rows.push({ phone: n, label });
  }
  return rows;
}

function foldVcardPhysicalLines(text: string): string[] {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescapeVcardValue(v: string): string {
  return String(v || "")
    .replace(/\\\\/g, "\0ESC\0")
    .replace(/\\n/g, "\n")
    .replace(/\\N/g, "\n")
    .replace(/\\;/g, ";")
    .replace(/\\,/g, ",")
    .replace(/\0ESC\0/g, "\\")
    .trim();
}

function vcardPropName(propPartUpper: string): string {
  const key = String(propPartUpper || "").split(";")[0];
  const dot = key.lastIndexOf(".");
  return (dot >= 0 ? key.slice(dot + 1) : key).toUpperCase();
}

export function parseVcardTextToRows(text: string): BulkRecipientRow[] {
  const rows: BulkRecipientRow[] = [];
  const seen = new Set<string>();
  const re = /BEGIN:VCARD[\s\S]*?END:VCARD/gi;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) blocks.push(m[0]);
  if (blocks.length === 0 && /^(?:FN|TEL|N);/im.test(String(text || "").trim())) {
    blocks.push(text);
  }
  for (const block of blocks) {
    const lines = foldVcardPhysicalLines(block);
    let fn = "";
    let nFamily = "";
    let nGiven = "";
    const tels: string[] = [];
    for (const line of lines) {
      const tline = line.trim();
      if (!tline || /^BEGIN:VCARD|^END:VCARD|^VERSION:/i.test(tline)) continue;
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const propPart = line.slice(0, colon);
      const rawVal = line.slice(colon + 1);
      const pname = vcardPropName(propPart.toUpperCase());
      if (pname === "FN") {
        fn = unescapeVcardValue(rawVal);
      } else if (pname === "N") {
        const nv = unescapeVcardValue(rawVal);
        const np = nv.split(";");
        nFamily = String(np[0] || "").trim();
        nGiven = String(np[1] || "").trim();
      } else if (pname === "TEL") {
        const tv = unescapeVcardValue(rawVal).replace(/^tel:/i, "").trim();
        if (tv) tels.push(tv);
      }
    }
    let displayName = fn.trim();
    if (!displayName) {
      displayName = [nFamily, nGiven].filter(Boolean).join(" ").trim();
    }
    for (const tel of tels) {
      const n = normalizeKoreanPhoneForSms(tel);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      rows.push({ phone: n, label: displayName ? `${displayName} · ${n}` : n });
    }
  }
  return rows;
}

function isVcardUpload(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".vcf") || name.endsWith(".vcard")) return true;
  const t = (file.type || "").toLowerCase();
  if (t === "text/vcard" || t === "text/x-vcard") return true;
  if (t === "text/directory" && (name.endsWith(".vcf") || name.endsWith(".vcard"))) return true;
  return false;
}

const VALID_EXT = [".xlsx", ".xls", ".csv", ".vcf", ".vcard"];

export function validateAddressbookFile(file: File): string | null {
  if (file.size === 0) return "빈 파일입니다. 다른 파일을 선택해 주세요.";
  if (file.size > 100 * 1024 * 1024) {
    return `파일이 너무 큽니다. 최대 100MB (현재 ${(file.size / 1024 / 1024).toFixed(2)}MB)`;
  }
  const name = (file.name || "").toLowerCase();
  const lastDot = name.lastIndexOf(".");
  if (lastDot > 0 && lastDot < name.length - 1) {
    const ext = name.slice(lastDot);
    if (!VALID_EXT.includes(ext)) {
      return "엑셀(.xlsx, .xls), CSV, VCard(.vcf, .vcard)만 사용할 수 있습니다.";
    }
  }
  return null;
}

export async function parseAddressbookFile(file: File): Promise<BulkRecipientRow[]> {
  const err = validateAddressbookFile(file);
  if (err) throw new Error(err);

  const lowerName = (file.name || "").toLowerCase();

  if (isVcardUpload(file)) {
    const txt = await file.text();
    const cleaned = txt.charCodeAt(0) === 0xfeff ? txt.slice(1) : txt;
    const rows = parseVcardTextToRows(cleaned);
    if (!rows.length) {
      throw new Error(
        "VCard 파일에서 유효한 휴대폰 번호를 찾지 못했습니다. TEL 필드를 확인해 주세요.",
      );
    }
    return rows;
  }

  const buf = await file.arrayBuffer();
  const data = new Uint8Array(buf);
  const isCsv =
    lowerName.endsWith(".csv") ||
    lowerName.includes("addressbook") ||
    lowerName.includes("주소록");

  let workbook: XLSX.WorkBook;
  if (isCsv) {
    try {
      workbook = XLSX.read(data, { type: "array", codepage: 949 });
    } catch {
      workbook = XLSX.read(data, { type: "array" });
    }
  } else {
    workbook = XLSX.read(data, { type: "array" });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("파일에 시트가 없습니다.");
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
  );
  if (!jsonData.length) throw new Error("파일에 데이터가 없습니다.");

  const firstRowKeys = Object.keys(jsonData[0] || {});
  const phoneKey = firstRowKeys.find((key) => {
    const k = String(key || "").trim();
    return (
      k.includes("휴대폰") ||
      k.includes("휴대전화") ||
      k.includes("휴대폰번호") ||
      k.includes("Mobile") ||
      k.toLowerCase().includes("phone") ||
      k === "전화번호"
    );
  });
  const nameKey = firstRowKeys.find((key) =>
    /이름|성명|표시\s*이름|표시이름|고객명|성함|닉네임|별명|연락처\s*별칭|^name$|display\s*name/i.test(
      String(key || "").trim(),
    ),
  );

  if (!phoneKey) {
    throw new Error(
      "휴대폰/전화번호 열을 찾지 못했습니다. 네이버 주소록 CSV 등 번호 열이 있는지 확인해 주세요.",
    );
  }

  const rows = extractPhoneRowsFromSheet(jsonData, phoneKey, nameKey);
  if (!rows.length) {
    throw new Error("유효한 휴대폰 번호를 찾지 못했습니다. 번호 형식·열 이름을 확인해 주세요.");
  }
  return rows;
}

function recipientDisplayName(row: BulkRecipientRow): string {
  if (row.name) return row.name;
  const lab = row.label || "";
  const sep = lab.indexOf(" · ");
  if (sep > 0) return lab.slice(0, sep).trim();
  return "";
}

/** Storage 업로드용 CSV — `index.html` `pingBulkBuildAddressbookCsvContent` */
export function buildBulkAddressbookCsvContent(list: BulkRecipientRow[]): string {
  const rows: string[][] = [["이름", "전화번호"]];
  for (const item of list || []) {
    rows.push([recipientDisplayName(item), item.phone || item.label || ""]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  return "\uFEFF" + XLSX.utils.sheet_to_csv(ws);
}
