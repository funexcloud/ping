import type { BulkSmsTemplateId } from "@/lib/ping-bulk-sms";
import { clearComposeImageSession } from "@/lib/ping-bulk-compose-image";
import { sanitizeBulkSmsBodyText } from "@/lib/ping-bulk-sms";
import { PING_MAIN_APP_PATH } from "@/lib/ping-main-path";

/** `assets/js/ping-flow-state.js` 와 동일 키·상수 (React는 전역 스크립트 없이 동작) */
export const PING_FLOW_KEY_ROUTE = "ping_flow_route";
export const PING_FLOW_KEY_STARTED = "ping_flow_started";
export const PING_FLOW_KEY_OBITUARY_URL = "ping_obituary_public_url";

export const ROUTE_BULK_DIRECT = "bulk_direct";
export const ROUTE_OBITUARY_THEN_BULK = "obituary_then_bulk";

const PING_FROM_INDEX = "ping_from_index";

/** React 대량 플로: 명단 확정 후 `/start` 에서 review 단계를 연다. */
export const PING_REACT_BULK_REVIEW_RETURN_KEY = "ping_react_bulk_review_return";
export const PING_REACT_BULK_PENDING_REVIEW_KEY = "ping_react_bulk_pending_review";

export type ReactBulkComposeHandoff = {
  title: string;
  body: string;
  templateId: BulkSmsTemplateId;
};

/** React `/start` pick 연 이후 Google OAuth 를 바로 시도할 때만 사용(파일 선택은 사용자 제스처 제약으로 레거시에서 다시 누름). */
export type ReactBulkLegacyHandoffOptions = {
  openGoogleContacts?: boolean;
  /** 답례 문자 플로 — `indexSetBulkFlowKind('thankyou')` 와 동일 */
  bulkFlowKind?: "obituary" | "thankyou";
};

export function getPingFlowRoute(): string {
  if (typeof window === "undefined") return "";
  try {
    return String(sessionStorage.getItem(PING_FLOW_KEY_ROUTE) || "").trim();
  } catch {
    return "";
  }
}

/** `ping_from_index` 세션에 신청자 요약이 있으면 true */
export function hasPingFromIndexSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem("ping_from_index");
    if (!raw) return false;
    const d = JSON.parse(raw) as unknown;
    return Boolean(d && typeof d === "object");
  } catch {
    return false;
  }
}

/** 부고 작성 완료 후 대량발송(주소록) 합류 — `PingFlowState.mergeToBulkFlow` 와 동일 */
export function mergeToBulkFlow(opts?: { obituaryPublicUrl?: string }) {
  if (typeof window === "undefined") return;
  try {
    try {
      sessionStorage.removeItem(PING_REACT_BULK_REVIEW_RETURN_KEY);
      sessionStorage.removeItem(PING_REACT_BULK_PENDING_REVIEW_KEY);
      clearComposeImageSession();
    } catch {
      /* ignore */
    }
    if (opts?.obituaryPublicUrl) {
      sessionStorage.setItem(
        PING_FLOW_KEY_OBITUARY_URL,
        String(opts.obituaryPublicUrl).trim(),
      );
    }
    sessionStorage.setItem(PING_FLOW_KEY_ROUTE, ROUTE_OBITUARY_THEN_BULK);
    sessionStorage.setItem(PING_FLOW_KEY_STARTED, "1");
    window.location.href = `${PING_MAIN_APP_PATH}?mergeBulk=1`;
  } catch (e) {
    console.error("mergeToBulkFlow", e);
  }
}

function writeBulkComposeToPingFromIndex(
  normalizedObituaryUrl: string,
  compose: ReactBulkComposeHandoff,
  bulkFlowKind: "obituary" | "thankyou",
): void {
  let prev: Record<string, unknown> = {};
  try {
    const raw = sessionStorage.getItem(PING_FROM_INDEX);
    if (raw) prev = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    prev = {};
  }
  const title = String(compose.title || "").slice(0, 40);
  const body = sanitizeBulkSmsBodyText(compose.body);
  const tid: BulkSmsTemplateId = compose.templateId === "2" ? "2" : "1";
  sessionStorage.setItem(
    PING_FROM_INDEX,
    JSON.stringify({
      ...prev,
      obituaryPageUrl: bulkFlowKind === "thankyou" ? "" : normalizedObituaryUrl,
      bulkFlowKind,
      bulkSmsTitle: title,
      bulkSmsMessageDraft: body,
      smsTemplateId: tid,
      ts: Date.now(),
    }),
  );
}

/** @deprecated 외부 compose 핸드오프용 — `/start` 단일 클라이언트에서는 미사용 */
export function handoffReactBulkEntryToStart(
  normalizedObituaryUrl: string,
  compose: ReactBulkComposeHandoff,
  opts?: ReactBulkLegacyHandoffOptions,
): void {
  if (typeof window === "undefined") return;
  const isThankYou = opts?.bulkFlowKind === "thankyou";
  const url = isThankYou ? "" : String(normalizedObituaryUrl || "").trim();
  try {
    if (isThankYou) {
      try {
        sessionStorage.removeItem(PING_FLOW_KEY_OBITUARY_URL);
      } catch {
        /* ignore */
      }
    } else {
      sessionStorage.setItem(PING_FLOW_KEY_OBITUARY_URL, url);
    }
    sessionStorage.setItem(PING_FLOW_KEY_ROUTE, ROUTE_BULK_DIRECT);
    sessionStorage.setItem(PING_FLOW_KEY_STARTED, "1");
    writeBulkComposeToPingFromIndex(url, compose, isThankYou ? "thankyou" : "obituary");
    sessionStorage.setItem(PING_REACT_BULK_REVIEW_RETURN_KEY, "1");
    const qs = new URLSearchParams({ mergeBulk: "1" });
    if (opts?.openGoogleContacts) qs.set("openGoogleContacts", "1");
    window.location.replace(`${PING_MAIN_APP_PATH}?${qs.toString()}`);
  } catch (e) {
    console.error("handoffReactBulkEntryToStart", e);
    window.location.replace(`${PING_MAIN_APP_PATH}?mergeBulk=1`);
  }
}
