/** `assets/js/ping-bulk-fee.js` · 레거시 `index.html` / `send/payments.html` 과 동기 (단가 단일 소스) */
export const PING_BULK_STANDARD_BASE_FEE = 0;
export const PING_BULK_STANDARD_SEND_FEE = 110;

export function computeBulkOrderTotals(recipientCount: number): {
  recipientCount: number;
  baseFee: number;
  sendCost: number;
  total: number;
} {
  const n = Math.max(0, Math.floor(Number(recipientCount) || 0));
  const sendCost = n * PING_BULK_STANDARD_SEND_FEE;
  const baseFee = PING_BULK_STANDARD_BASE_FEE;
  return {
    recipientCount: n,
    baseFee,
    sendCost,
    total: baseFee + sendCost,
  };
}
