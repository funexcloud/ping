/**
 * 부고 URL → 문자 작성 단계 진입 (UI 경계)
 *
 * bulk-entry 등 UI는 이 파일만 import 한다.
 * 파싱은 `src/lib/bugo-funeral-parse.ts` · fetch/메시지는 `bugo-import.js` · 세션은 `ping-bugo-import`.
 */
import { loadPingFromIndexSnapshot } from "@/lib/ping-bulk-session";
import {
  BULK_SMS_TITLE_MAX_CHARS,
  getStaticBulkTemplateBody,
  sanitizeBulkSmsBodyText,
  truncateBulkSmsBodyToMaxBytes,
  type BulkSmsTemplateId,
} from "@/lib/ping-bulk-sms";
import {
  isBugoFuneralImportUrl,
  persistBulkSmsComposeToPingFromIndex,
  persistObituaryUrlToPingFromIndex,
  tryBugoImportForUrl,
} from "@/lib/ping-bugo-import";
import {
  EXTERNAL_OBITUARY_URL_HINT,
  extractFirstHttpsUrl,
  isValidExternalObituaryUrl,
  normalizeExternalObituaryUrl,
} from "@/lib/ping-obituary-url";

export type BulkComposeHydrate = {
  templateId: BulkSmsTemplateId;
  title: string;
  body: string;
};

export type AdvanceObituaryUrlResult =
  | { ok: false; reason: "invalid_url"; hint: string }
  | {
      ok: true;
      normalizedUrl: string;
      compose: BulkComposeHydrate;
      importWarning?: string;
    };

/** import 중복·in-flight — UI와 무관한 세션 상태 */
export class BugoImportSession {
  lastImportedUrl = "";
  inFlight = { current: false };

  resetImportCacheIfUrlChanged(raw: string): void {
    const nv = normalizeExternalObituaryUrl(raw);
    if (!isBugoFuneralImportUrl(nv)) {
      this.lastImportedUrl = "";
      return;
    }
    if (this.lastImportedUrl && this.lastImportedUrl !== nv) {
      this.lastImportedUrl = "";
    }
  }

  markImported(normalizedUrl: string): void {
    this.lastImportedUrl = normalizedUrl;
  }
}

export function readBulkComposeHydrateFromSession(
  fallbackTemplateId: BulkSmsTemplateId,
  existingBody = "",
): BulkComposeHydrate {
  const snap = loadPingFromIndexSnapshot();
  const templateId: BulkSmsTemplateId =
    snap.smsTemplateId === "2" ? "2" : fallbackTemplateId;
  const draft = String(snap.bulkSmsMessageDraft || "").trim();
  let body: string;
  if (draft) {
    body = truncateBulkSmsBodyToMaxBytes(sanitizeBulkSmsBodyText(draft));
  } else {
    const t = String(existingBody || "").trim();
    body = t
      ? truncateBulkSmsBodyToMaxBytes(sanitizeBulkSmsBodyText(existingBody))
      : truncateBulkSmsBodyToMaxBytes(getStaticBulkTemplateBody(templateId));
  }
  const title = String(snap.bulkSmsTitle || "").trim().slice(0, BULK_SMS_TITLE_MAX_CHARS);
  return { templateId, title, body };
}

/**
 * URL 단계 → compose: URL 검증, 저장, (지원 시) 부고 가져오기, compose 상태 반환.
 * UI는 결과만 반영한다 — 파싱 실패해도 compose 진입(수동 작성).
 */
export async function advanceBulkEntryFromObituaryUrl(
  rawUrl: string,
  session: BugoImportSession,
  fallbackTemplateId: BulkSmsTemplateId,
  existingBody = "",
): Promise<AdvanceObituaryUrlResult> {
  const normalizedUrl = normalizeExternalObituaryUrl(rawUrl);
  if (!isValidExternalObituaryUrl(normalizedUrl)) {
    return { ok: false, reason: "invalid_url", hint: EXTERNAL_OBITUARY_URL_HINT };
  }

  persistObituaryUrlToPingFromIndex(normalizedUrl);

  let importWarning: string | undefined;
  try {
    await tryBugoImportForUrl(normalizedUrl, session.lastImportedUrl, session.inFlight);
    session.markImported(normalizedUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "부고 내용을 가져오지 못했습니다.";
    importWarning = `${msg}\n\n부고 문자는 다음 단계에서 직접 작성·수정할 수 있습니다.`;
  }

  const compose = readBulkComposeHydrateFromSession(fallbackTemplateId, existingBody);
  return { ok: true, normalizedUrl, compose, importWarning };
}

export function parseObituaryUrlPaste(text: string): {
  url: string;
  hint: string | null;
  canAdvance: boolean;
} {
  const url = extractFirstHttpsUrl(text) || "";
  if (String(text).trim() && !url) {
    return { url: "", hint: EXTERNAL_OBITUARY_URL_HINT, canAdvance: false };
  }
  const normalized = normalizeExternalObituaryUrl(url);
  return {
    url,
    hint: null,
    canAdvance: isValidExternalObituaryUrl(normalized),
  };
}

export function normalizeObituaryUrlForField(raw: string): string {
  return normalizeExternalObituaryUrl(raw);
}

export function isObituaryUrlFieldValid(raw: string): boolean {
  return isValidExternalObituaryUrl(normalizeExternalObituaryUrl(raw));
}

/** compose → pick / review 직전 세션 동기화 */
export function persistBulkComposeToPingFromIndex(opts: {
  title: string;
  body: string;
  templateId: BulkSmsTemplateId;
  obituaryPageUrl?: string;
  bulkFlowKind?: "obituary" | "thankyou";
}): void {
  persistBulkSmsComposeToPingFromIndex(opts);
}

export { EXTERNAL_OBITUARY_URL_HINT };
