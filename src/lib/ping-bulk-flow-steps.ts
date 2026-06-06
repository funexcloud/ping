/** PING 대량 발송 9단계 — `docs/ping-bulk-send-process.md` 와 동일 */
export const BULK_FLOW_STEP_COUNT = 9;

export const BULK_FLOW_STEP_LABELS = [
  "부고 주소",
  "부고 문자",
  "연락처",
  "결제금액 안내",
  "로그인",
  "결제하기",
  "발송 중",
  "발송완료",
  "부의금 명단",
] as const;

export type BulkFlowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type BulkWizardStep = "url" | "compose" | "pick" | "review";

export function bulkFlowStepPercent(step: BulkFlowStep): number {
  return Math.round((step / BULK_FLOW_STEP_COUNT) * 100);
}

export function bulkFlowStepLabel(step: BulkFlowStep, override?: string): string {
  if (override) return override;
  return BULK_FLOW_STEP_LABELS[step - 1] ?? "";
}

export function bulkFlowStepFromWizard(wizard: BulkWizardStep): BulkFlowStep {
  const map: Record<BulkWizardStep, BulkFlowStep> = {
    url: 1,
    compose: 2,
    pick: 3,
    review: 4,
  };
  return map[wizard];
}

/** `/start` 위저드 첫 화면 — 부고: url, 답례: compose (상단 뒤로 숨김) */
export function isBulkWizardFirstStep(
  step: BulkWizardStep,
  isThankYouFlow: boolean,
): boolean {
  return isThankYouFlow ? step === "compose" : step === "url";
}
