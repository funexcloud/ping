/** PG 심사 전 무통장 입금 (체크아웃) */
export const PING_BANK_TRANSFER = {
  bankName: "토스뱅크",
  accountNumber: "1000-8536-9246",
  holder: "송지훈",
} as const;

/** 체크아웃 → payment-success 직후 Firestore 반영 전 폴백 */
export const PING_BANK_TRANSFER_CONFIRM_KEY = "ping_bank_transfer_confirmed";
/** Firestore 반영 전 입금 안내 허용 — 체크아웃 직후만 (Phase 2) */
export const PING_BANK_TRANSFER_CONFIRM_TTL_MS = 15 * 60 * 1000;
/** 체크아웃 직후 결제 수단 (URL·confirm 세션 유실 시 payment-success 폴백) */
export const PING_CHECKOUT_LAST_PAYMENT_METHOD_KEY = "ping_checkout_last_payment_method";

export function markCheckoutPaymentMethod(method: "bank" | "card"): void {
  try {
    sessionStorage.setItem(PING_CHECKOUT_LAST_PAYMENT_METHOD_KEY, method);
  } catch {
    /* ignore */
  }
}

export function readCheckoutWasBankTransfer(): boolean {
  try {
    return sessionStorage.getItem(PING_CHECKOUT_LAST_PAYMENT_METHOD_KEY) === "bank";
  } catch {
    return false;
  }
}

export function clearCheckoutPaymentMethodMarker(): void {
  try {
    sessionStorage.removeItem(PING_CHECKOUT_LAST_PAYMENT_METHOD_KEY);
  } catch {
    /* ignore */
  }
}

export function saveBankTransferConfirmSession(orderId: string, amount: number): void {
  try {
    sessionStorage.setItem(
      PING_BANK_TRANSFER_CONFIRM_KEY,
      JSON.stringify({
        orderId: String(orderId || "").trim(),
        amount: Math.max(0, Math.floor(Number(amount))),
        ts: Date.now(),
      }),
    );
    markCheckoutPaymentMethod("bank");
  } catch {
    /* ignore */
  }
}

export type BankTransferConfirmSnap = {
  orderId: string;
  amount: number;
};

function parseBankTransferConfirmSession(): BankTransferConfirmSnap | null {
  try {
    const raw = sessionStorage.getItem(PING_BANK_TRANSFER_CONFIRM_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as { orderId?: string; amount?: number; ts?: number };
    const oid = String(snap?.orderId || "").trim();
    const amt = Math.floor(Number(snap?.amount));
    const ts = Number(snap?.ts);
    if (!oid || !Number.isFinite(amt) || amt < 0) return null;
    if (!Number.isFinite(ts) || Date.now() - ts > PING_BANK_TRANSFER_CONFIRM_TTL_MS) return null;
    return { orderId: oid, amount: amt };
  } catch {
    return null;
  }
}

/** 주문번호·금액 모두 일치 (엄격) */
export function readBankTransferConfirmSession(orderId: string, amount: number): boolean {
  const snap = parseBankTransferConfirmSession();
  if (!snap) return false;
  return (
    snap.orderId === String(orderId || "").trim() &&
    snap.amount === Math.floor(Number(amount))
  );
}

/** 체크아웃 직후 — 주문번호만 맞으면 무통장 입금 안내로 인정 (금액은 스냅·URL 우선) */
export function readBankTransferConfirmForOrder(orderId: string): BankTransferConfirmSnap | null {
  const snap = parseBankTransferConfirmSession();
  const oid = String(orderId || "").trim();
  if (!snap || !oid || snap.orderId !== oid) return null;
  return snap;
}

export function clearBankTransferConfirmSession(): void {
  try {
    sessionStorage.removeItem(PING_BANK_TRANSFER_CONFIRM_KEY);
    clearCheckoutPaymentMethodMarker();
  } catch {
    /* ignore */
  }
}

export function formatBankTransferCopyText(): string {
  const { bankName, accountNumber, holder } = PING_BANK_TRANSFER;
  return `${bankName} ${accountNumber} ${holder}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const t = String(text || "").trim();
  if (!t) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
