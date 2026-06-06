/**
 * 부고 1건 발송 진행 상태 — [접수] → [세팅중] → [발송완료]
 * `smsStatus=sent` 이더라도 failedCount/targetCount 로 부분 실패를 구분한다.
 */

export type FulfillmentPhase =
  | "received"
  | "dispatching"
  | "complete"
  | "partial"
  | "failed";

export type FulfillmentOrderInput = {
  status?: string | null;
  smsStatus?: string | null;
  count?: number | null;
  totalCount?: number | null;
  targetCount?: number | null;
  smsSentCount?: number | null;
  successCount?: number | null;
  failedCount?: number | null;
  smsResult?: {
    targetCount?: number | null;
    sentCount?: number | null;
    failedCount?: number | null;
  } | null;
};

export type DispatchCounts = {
  targetCount: number | null;
  sentCount: number | null;
  failedCount: number | null;
};

export type FulfillmentDerived = DispatchCounts & {
  phase: FulfillmentPhase;
  /** UI 문장용 */
  label: string;
  /** 칩·뱃지용 (접수 / 세팅중 / 발송완료 / 부분실패 / 발송실패) */
  chipLabel: string;
};

function pickFiniteCount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** 발송 집계 — 주문 필드·smsResult 폴백 */
export function resolveDispatchCounts(order: FulfillmentOrderInput | null | undefined): DispatchCounts {
  if (!order || typeof order !== "object") {
    return { targetCount: null, sentCount: null, failedCount: null };
  }

  const smsResult =
    order.smsResult && typeof order.smsResult === "object" ? order.smsResult : null;

  const targetCount =
    pickFiniteCount(order.targetCount) ??
    pickFiniteCount(order.count) ??
    pickFiniteCount(order.totalCount) ??
    pickFiniteCount(smsResult?.targetCount);

  const sentCount =
    pickFiniteCount(order.smsSentCount) ??
    pickFiniteCount(order.successCount) ??
    pickFiniteCount(smsResult?.sentCount);

  let failedCount =
    pickFiniteCount(order.failedCount) ?? pickFiniteCount(smsResult?.failedCount);

  if (failedCount == null && targetCount != null && sentCount != null) {
    failedCount = Math.max(0, targetCount - sentCount);
  }

  return { targetCount, sentCount, failedCount };
}

function isDispatchPartial(counts: DispatchCounts): boolean {
  const { targetCount, sentCount, failedCount } = counts;
  if (failedCount != null && failedCount > 0) return true;
  if (targetCount != null && sentCount != null && sentCount > 0 && sentCount < targetCount) {
    return true;
  }
  return false;
}

const PHASE_COPY: Record<
  FulfillmentPhase,
  { label: string; chipLabel: string }
> = {
  received: { label: "접수", chipLabel: "접수" },
  dispatching: { label: "세팅중", chipLabel: "세팅중" },
  complete: { label: "발송완료", chipLabel: "발송완료" },
  partial: { label: "부분 실패", chipLabel: "부분실패" },
  failed: { label: "발송 실패", chipLabel: "발송실패" },
};

export function deriveFulfillmentPhase(
  order: FulfillmentOrderInput | null | undefined,
): FulfillmentDerived {
  const counts = resolveDispatchCounts(order);
  const status = String(order?.status ?? "").trim();
  const smsStatus = String(order?.smsStatus ?? "").trim();

  let phase: FulfillmentPhase;

  if (status === "waiting_bank_transfer") {
    phase = "received";
  } else if (status !== "paid") {
    phase = "received";
  } else if (smsStatus === "failed") {
    phase = "failed";
  } else if (smsStatus === "sending" || smsStatus === "") {
    phase = "dispatching";
  } else if (smsStatus === "sent") {
    phase = isDispatchPartial(counts) ? "partial" : "complete";
  } else {
    phase = "dispatching";
  }

  const copy = PHASE_COPY[phase];
  return {
    phase,
    label: copy.label,
    chipLabel: copy.chipLabel,
    ...counts,
  };
}

/** payment-success BulkFlowProgress — 발송완료만 8단계 */
export function fulfillmentToBulkFlowStep(phase: FulfillmentPhase): 7 | 8 {
  return phase === "complete" ? 8 : 7;
}

export function fulfillmentBulkFlowLabelOverride(
  phase: FulfillmentPhase,
  opts?: { bankDepositPending?: boolean },
): string | undefined {
  if (opts?.bankDepositPending) return "접수";
  if (phase === "partial") return "부분 실패";
  if (phase === "failed") return "발송 실패";
  if (phase === "dispatching") return "세팅중";
  if (phase === "received") return "접수";
  return undefined;
}
