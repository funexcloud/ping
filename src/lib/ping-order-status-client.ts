/** payment-success · 체크아웃 — 서버 `GET /api/orders/:id/status` 단일 검증 (Phase 2) */

export type OrderStatusPayload = {
  ok?: boolean;
  error?: string;
  orderId?: string;
  status?: string;
  paymentMethod?: string;
  smsStatus?: string;
  cashReceiptType?: string;
  cashReceiptVoluntary?: boolean;
  cashReceiptStatus?: string;
  cashReceiptApprovalNo?: string | null;
  totalAmount?: number;
  successCount?: number | null;
  smsSentCount?: number | null;
  targetCount?: number | null;
  failedCount?: number | null;
  fulfillmentPhase?: string;
  fulfillmentLabel?: string;
  fulfillmentChipLabel?: string;
  sendFromLabel?: string;
  paymentDispatchAligned?: boolean;
  canRetryDispatch?: boolean;
  refundEligible?: boolean;
  canRequestRefund?: boolean;
  refundStatus?: string | null;
  paymentDispatchMismatch?: string | null;
};

export type RetryDispatchResult =
  | { ok: true; alreadyDispatched?: boolean; dispatchSkipped?: boolean }
  | { ok: false; error?: string; code?: string };

export type OrderStatusVerifyResult =
  | { ok: true; data: OrderStatusPayload }
  | { ok: false; code: string; httpStatus?: number };

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function fetchOrderStatusOnce(
  orderId: string,
  amount: number,
): Promise<OrderStatusVerifyResult> {
  const oid = String(orderId || "").trim();
  const want = Math.floor(Number(amount));
  try {
    const res = await fetch(
      `/api/orders/${encodeURIComponent(oid)}/status?amount=${want}`,
      { cache: "no-store" },
    );
    const json = (await res.json().catch(() => ({}))) as OrderStatusPayload & {
      error?: string;
    };
    if (res.status === 503 && json.error === "no_admin_db") {
      return { ok: false, code: "no_admin_db", httpStatus: res.status };
    }
    if (res.status === 404 || json.error === "missing") {
      return { ok: false, code: "missing", httpStatus: res.status };
    }
    if (json.error === "amount_mismatch") {
      return { ok: false, code: "amount_mismatch", httpStatus: res.status };
    }
    if (!res.ok || !json.ok) {
      return { ok: false, code: "error", httpStatus: res.status };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, code: "network" };
  }
}

export async function pollOrderStatusUntil(
  orderId: string,
  amount: number,
  opts: {
    maxAttempts?: number;
    intervalMs?: number;
    acceptStatuses?: Set<string>;
  } = {},
): Promise<OrderStatusVerifyResult> {
  const maxAttempts = opts.maxAttempts ?? 15;
  const intervalMs = opts.intervalMs ?? 400;
  const accept = opts.acceptStatuses ?? new Set(["paid"]);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const r = await fetchOrderStatusOnce(orderId, amount);
    if (!r.ok) {
      if (
        r.code === "missing" ||
        r.code === "amount_mismatch" ||
        r.code === "no_admin_db"
      ) {
        return r;
      }
      if (attempt < maxAttempts - 1) {
        await sleep(intervalMs);
        continue;
      }
      return r;
    }
    const st = String(r.data.status || "").trim();
    if (st === "waiting_payment") {
      await sleep(intervalMs);
      continue;
    }
    if (accept.has(st)) return r;
    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs);
      continue;
    }
    return { ok: false, code: "not_paid", httpStatus: 200 };
  }
  return { ok: false, code: "timeout_pending" };
}

export type RequestRefundResult =
  | { ok: true; alreadyRefunded?: boolean; refundStatus?: string }
  | { ok: false; error?: string; code?: string; manual?: boolean };

export async function requestOrderRefund(
  orderId: string,
  amount: number,
  opts: { deviceId?: string; referralCode?: string } = {},
): Promise<RequestRefundResult> {
  const oid = String(orderId || "").trim();
  const want = Math.floor(Number(amount));
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(oid)}/request-refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: want,
        deviceId: opts.deviceId || undefined,
        referralCode: opts.referralCode || undefined,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      alreadyRefunded?: boolean;
      refundStatus?: string;
      message?: string;
    };
    if (json.error === "manual_refund_required") {
      return { ok: false, error: json.message || json.error, manual: true };
    }
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error || "refund_failed", code: String(res.status) };
    }
    return {
      ok: true,
      alreadyRefunded: json.alreadyRefunded === true,
      refundStatus: json.refundStatus,
    };
  } catch {
    return { ok: false, error: "network", code: "network" };
  }
}

function readCheckoutDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const w = window as Window & {
      PingReferralPoints?: { getDeviceId?: () => string };
    };
    if (w.PingReferralPoints?.getDeviceId) {
      return String(w.PingReferralPoints.getDeviceId() || "").trim();
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function getRefundDeviceIdForOrder(): string {
  return readCheckoutDeviceId();
}

export async function retryOrderDispatch(
  orderId: string,
  amount: number,
): Promise<RetryDispatchResult> {
  const oid = String(orderId || "").trim();
  const want = Math.floor(Number(amount));
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(oid)}/retry-dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: want }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      alreadyDispatched?: boolean;
      dispatchSkipped?: boolean;
    };
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error || "retry_failed", code: String(res.status) };
    }
    return {
      ok: true,
      alreadyDispatched: json.alreadyDispatched === true,
      dispatchSkipped: json.dispatchSkipped === true,
    };
  } catch {
    return { ok: false, error: "network", code: "network" };
  }
}
