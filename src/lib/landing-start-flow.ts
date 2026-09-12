import { readPingFromIndexRecord, writePingFromIndexRecord } from "@/lib/ping-bugo-import";
import {
  LANDING_SEND_BULK_AFTER_URL,
  LANDING_SEND_FLOW_PATH,
} from "@/content/landing/landing-config";
import {
  PING_FLOW_KEY_OBITUARY_URL,
  PING_FLOW_KEY_ROUTE,
  PING_FLOW_KEY_STARTED,
  ROUTE_BULK_DIRECT,
} from "@/lib/ping-flow-client";
import {
  EXTERNAL_OBITUARY_URL_HINT,
  isValidExternalObituaryUrl,
  normalizeExternalObituaryUrl,
} from "@/lib/ping-obituary-url";

export { EXTERNAL_OBITUARY_URL_HINT };

export function buildLandingStartHref(): string {
  return LANDING_SEND_FLOW_PATH;
}

/** 부고 URL을 세션에 저장하고 `/start` 발송 플로로 이동 */
export function navigateToStartWithObituaryUrl(rawUrl: string): { ok: true } | { ok: false; message: string } {
  if (typeof window === "undefined") {
    return { ok: false, message: "브라우저에서만 이용할 수 있습니다." };
  }

  const normalized = normalizeExternalObituaryUrl(rawUrl);
  if (!isValidExternalObituaryUrl(normalized)) {
    return { ok: false, message: EXTERNAL_OBITUARY_URL_HINT };
  }

  try {
    const prev = readPingFromIndexRecord();
    prev.obituaryPageUrl = normalized;
    prev.bulkFlowKind = "obituary";
    if (!prev.smsTemplateId) prev.smsTemplateId = "1";
    writePingFromIndexRecord(prev);

    sessionStorage.setItem(PING_FLOW_KEY_OBITUARY_URL, normalized);
    sessionStorage.setItem(PING_FLOW_KEY_ROUTE, ROUTE_BULK_DIRECT);
    sessionStorage.setItem(PING_FLOW_KEY_STARTED, "1");
  } catch {
    return { ok: false, message: "저장에 실패했습니다. 다시 시도해 주세요." };
  }

  window.location.href = `${LANDING_SEND_FLOW_PATH}?${LANDING_SEND_BULK_AFTER_URL}`;
  return { ok: true };
}
