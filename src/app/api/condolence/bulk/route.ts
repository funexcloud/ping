import type { CondolenceMoney } from "@prisma/client";
import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const NAME_KEYS = ["이름", "name", "성명"];
const PHONE_KEYS = ["전화번호", "phone", "휴대폰", "연락처"];
const AMOUNT_KEYS = ["금액(원)", "금액", "amount"];
const NOTE_KEYS = ["메모", "note", "비고"];

function normalizeHeader(key: string): string {
  return key.trim().toLowerCase();
}

function pickValue(
  row: Record<string, unknown>,
  aliases: string[],
): unknown {
  const normalizedAliases = new Set(aliases.map((a) => normalizeHeader(a)));
  for (const key of Object.keys(row)) {
    if (normalizedAliases.has(normalizeHeader(key))) {
      return row[key];
    }
  }
  return undefined;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const n = parseInt(value.replace(/,/g, "").trim(), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function rowIsEmpty(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => {
    if (v === undefined || v === null) return true;
    if (typeof v === "string" && v.trim() === "") return true;
    return false;
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const bugoRequestId = form.get("bugoRequestId");
  const singleFile = form.get("file");

  if (typeof bugoRequestId !== "string" || !bugoRequestId.trim()) {
    return NextResponse.json(
      { error: "bugoRequestId is required (form field)" },
      { status: 400 },
    );
  }

  const file = singleFile instanceof File ? singleFile : null;
  if (!file || file.size === 0) {
    return NextResponse.json(
      { error: "file is required (multipart field: file)" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buf, { type: "buffer" });
  } catch {
    return NextResponse.json(
      { error: "Could not parse file as CSV or Excel" },
      { status: 400 },
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: "Spreadsheet has no sheets" }, { status: 400 });
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const matched: CondolenceMoney[] = [];
  const unmatched: Array<{
    rowIndex: number;
    reason: string;
    name?: string;
    phone?: string;
    amount?: unknown;
    note?: unknown;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (rowIsEmpty(row)) continue;

    const rowIndex = i + 2;
    const nameVal = pickValue(row, NAME_KEYS);
    const name =
      nameVal === undefined || nameVal === null
        ? ""
        : String(nameVal).trim();
    const phoneRawVal = pickValue(row, PHONE_KEYS);
    const phoneRaw =
      phoneRawVal === undefined || phoneRawVal === null
        ? ""
        : String(phoneRawVal).trim();
    const noteVal = pickValue(row, NOTE_KEYS);
    const amountVal = pickValue(row, AMOUNT_KEYS);
    const amount = parseAmount(amountVal);

    if (!phoneRaw || amount === null) {
      unmatched.push({
        rowIndex,
        reason: "missing_phone_or_amount",
        name: name || undefined,
        phone: phoneRaw || undefined,
        amount: amountVal,
        note: noteVal,
      });
      continue;
    }

    const phoneNorm = normalizePhone(phoneRaw);
    if (!phoneNorm) {
      unmatched.push({
        rowIndex,
        reason: "invalid_phone",
        name: name || undefined,
        phone: phoneRaw,
        amount: amountVal,
        note: noteVal,
      });
      continue;
    }

    const contact = await prisma.contact.findFirst({
      where: { phone: phoneNorm },
    });

    if (!contact) {
      unmatched.push({
        rowIndex,
        reason: "contact_not_found",
        name: name || undefined,
        phone: phoneRaw,
        amount: amountVal,
        note: noteVal,
      });
      continue;
    }

    const note =
      noteVal === undefined || noteVal === null || String(noteVal).trim() === ""
        ? null
        : String(noteVal);

    const saved = await prisma.condolenceMoney.upsert({
      where: { contactId: contact.id },
      create: {
        contactId: contact.id,
        bugoRequestId,
        amount,
        note,
      },
      update: {
        bugoRequestId,
        amount,
        note,
      },
    });

    matched.push(saved);
  }

  return NextResponse.json({
    bugoRequestId,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    matched,
    unmatched,
  });
}
