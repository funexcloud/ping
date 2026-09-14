import type { FulfillmentDerived, FulfillmentPhase } from "@/lib/ping-order-fulfillment";

/** Provider `sent`는 통신망 접수이지 단말기 도달이 아니다. */
export function formatKnownCount(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value).toLocaleString("ko-KR");
}

export function fulfillmentHeadline(phase: FulfillmentPhase): string {
  switch (phase) {
    case "dispatching":
      return "발송 중";
    case "received":
      return "발송 요청 완료";
    case "complete":
      return "발송 요청 완료";
    case "partial":
      return "일부 실패";
    case "failed":
      return "발송 실패";
  }
}

export function fulfillmentLead(phase: FulfillmentPhase): string {
  switch (phase) {
    case "dispatching":
      return "PING이 메시지를 보내고 있습니다. 잠시만 기다려 주세요.";
    case "received":
      return "발송 요청이 접수되었습니다.";
    case "complete":
      return "통신망 접수가 완료되었습니다. 단말기 도달은 별도로 확인됩니다.";
    case "partial":
      return "일부 건은 통신망 접수에 실패했습니다.";
    case "failed":
      return "발송 요청을 완료하지 못했습니다.";
  }
}

export type FulfillmentStepKey = "contacts" | "send" | "result";
export type FulfillmentStepState = "done" | "active" | "idle" | "fail";

export function fulfillmentStepStates(
  phase: FulfillmentPhase,
): Record<FulfillmentStepKey, FulfillmentStepState> {
  if (phase === "failed") {
    return { contacts: "done", send: "fail", result: "idle" };
  }
  if (phase === "partial") {
    return { contacts: "done", send: "done", result: "fail" };
  }
  if (phase === "complete") {
    return { contacts: "done", send: "done", result: "active" };
  }
  if (phase === "dispatching") {
    return { contacts: "done", send: "active", result: "idle" };
  }
  return { contacts: "done", send: "idle", result: "idle" };
}

export type FulfillmentStatRow = {
  key: "total" | "accepted" | "progress" | "failed";
  label: string;
  value: string;
};

/** 실제 집계만. 전달 완료 행은 도달 데이터가 있을 때만(현재 없음). */
export function fulfillmentStatRows(data: FulfillmentDerived): FulfillmentStatRow[] {
  const rows: FulfillmentStatRow[] = [];
  const total = formatKnownCount(data.targetCount);
  if (total) rows.push({ key: "total", label: "전체", value: `${total}명` });

  if (data.phase === "dispatching") {
    const sent = formatKnownCount(data.sentCount);
    if (sent) rows.push({ key: "progress", label: "진행 중", value: `${sent}명` });
  }

  if (data.phase === "complete" || data.phase === "partial") {
    const accepted = formatKnownCount(data.sentCount);
    if (accepted) rows.push({ key: "accepted", label: "발송 요청", value: `${accepted}명` });
  }

  if (data.failedCount != null && data.failedCount > 0) {
    const failed = formatKnownCount(data.failedCount);
    if (failed) rows.push({ key: "failed", label: "실패", value: `${failed}명` });
  }

  return rows;
}

export function fulfillmentProgressPercent(data: FulfillmentDerived): number | null {
  if (data.targetCount == null || data.targetCount <= 0 || data.sentCount == null) return null;
  return Math.min(100, Math.round((data.sentCount / data.targetCount) * 100));
}
