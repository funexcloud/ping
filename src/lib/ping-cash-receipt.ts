/** 무통장 입금 — 현금영수증 발급 구분 */
export type PingCashReceiptType = "income_deduction" | "expense_proof";

export const PING_CASH_RECEIPT_TYPE_LABELS: Record<PingCashReceiptType, string> = {
  income_deduction: "소득공제용 (개인)",
  expense_proof: "지출증빙용 (사업자)",
};

/** 현금영수증 자진발급 식별번호 (국세청 안내 관행 번호) */
export const PING_CASH_RECEIPT_VOLUNTARY_NUMBER: Record<PingCashReceiptType, string> = {
  income_deduction: "0100001234",
  expense_proof: "0000000000",
};

export function isVoluntaryCashReceiptNumber(
  type: PingCashReceiptType,
  normalized: string,
): boolean {
  return normalized === PING_CASH_RECEIPT_VOLUNTARY_NUMBER[type];
}

export function resolveCashReceiptNumber(
  type: PingCashReceiptType,
  raw: string,
  voluntary: boolean,
): string {
  if (voluntary) return PING_CASH_RECEIPT_VOLUNTARY_NUMBER[type];
  return normalizeCashReceiptNumber(type, raw);
}

export function normalizeCashReceiptNumber(type: PingCashReceiptType, raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (type === "income_deduction") {
    let d = digits;
    if (d.startsWith("82") && d.length >= 10) d = "0" + d.slice(2);
    return d;
  }
  return digits;
}

export function validateCashReceiptNumber(
  type: PingCashReceiptType,
  raw: string,
  voluntary = false,
): string | null {
  if (voluntary) return null;
  const n = normalizeCashReceiptNumber(type, raw);
  if (type === "income_deduction") {
    if (!/^01[016789]\d{7,8}$/.test(n)) {
      return "소득공제용은 휴대폰 번호(010 등)를 입력해 주세요.";
    }
    return null;
  }
  if (!/^\d{10}$/.test(n)) {
    return "지출증빙용은 사업자등록번호 10자리를 입력해 주세요.";
  }
  return null;
}

export function formatVoluntaryCashReceiptDisplay(type: PingCashReceiptType): string {
  if (type === "income_deduction") return "010-0000-1234";
  return "0000000000";
}

export function formatCashReceiptNumberDisplay(type: PingCashReceiptType, raw: string): string {
  const n = normalizeCashReceiptNumber(type, raw);
  if (type === "expense_proof" && n.length === 10) {
    return `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}`;
  }
  if (type === "income_deduction" && n.length >= 10) {
    return n.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
  }
  return n;
}
