import type { BulkFlowStep, BulkWizardStep } from "@/lib/ping-bulk-flow-steps";
import { pingAssignToLocation } from "@/lib/ping-nav-home";

export const PING_BULK_WIZARD_RESUME_STEP_KEY = "ping_bulk_wizard_resume_step";

export function resumeBulkWizardStep(step: BulkWizardStep): void {
  try {
    sessionStorage.setItem(PING_BULK_WIZARD_RESUME_STEP_KEY, step);
  } catch {
    /* ignore */
  }
}

export function peekBulkWizardResumeStep(): BulkWizardStep | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PING_BULK_WIZARD_RESUME_STEP_KEY);
    if (raw === "url" || raw === "compose" || raw === "pick") {
      return raw;
    }
    if (raw === "review") return "pick";
  } catch {
    /* ignore */
  }
  return null;
}

export function consumeBulkWizardResumeStep(): BulkWizardStep | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PING_BULK_WIZARD_RESUME_STEP_KEY);
    sessionStorage.removeItem(PING_BULK_WIZARD_RESUME_STEP_KEY);
    if (raw === "url" || raw === "compose" || raw === "pick") {
      return raw;
    }
    if (raw === "review") return "pick";
  } catch {
    /* ignore */
  }
  return null;
}

/** 9단계 대량 발송 — 헤더 뒤로는 직전 단계(고정 URL) */
export function navigateBulkFlowBack(fromStep: BulkFlowStep): void {
  switch (fromStep) {
    case 4:
      resumeBulkWizardStep("pick");
      pingAssignToLocation("/start");
      break;
    case 5:
      pingAssignToLocation("/send/payments");
      break;
    case 6:
      pingAssignToLocation("/login");
      break;
    default:
      pingAssignToLocation("/");
  }
}

export function bulkFlowBackAriaLabel(fromStep: BulkFlowStep): string {
  const labels: Partial<Record<BulkFlowStep, string>> = {
    4: "연락처 단계로",
    5: "결제 금액 확인으로",
    6: "본인 확인으로",
  };
  return labels[fromStep] ?? "이전 단계로";
}
