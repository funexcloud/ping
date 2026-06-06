import {
  isSupportedFuneralImportUrl,
} from "@/lib/bugo-import-url";
import { loadPingFromIndexSnapshot } from "@/lib/ping-bulk-session";
import { sanitizeBulkSmsBodyText, type BulkSmsTemplateId } from "@/lib/ping-bulk-sms";
import {
  normalizeExternalObituaryUrl,
} from "@/lib/ping-obituary-url";

const PING_FROM_INDEX = "ping_from_index";

export type BugoImportApiData = {
  ok?: boolean;
  error?: string;
  url?: string;
  messageBody?: string;
  messageBodyTemplate2?: string;
  parsed?: { deceasedName?: string };
};

export function readPingFromIndexRecord(): Record<string, unknown> {
  return loadPingFromIndexSnapshot();
}

export function writePingFromIndexRecord(prev: Record<string, unknown>) {
  try {
    prev.ts = Date.now();
    sessionStorage.setItem(PING_FROM_INDEX, JSON.stringify(prev));
  } catch (e) {
    console.warn("ping_from_index 저장 실패", e);
  }
}

export function getBugoImportApiUrlCandidates(): string[] {
  const paths = ["/api/import/bugo-funeral", "/api/import/wooribugo-funeral"];
  const seen: Record<string, number> = {};
  const out: string[] = [];
  function addBase(base: string) {
    if (!base) return;
    const b = String(base).trim().replace(/\/+$/, "");
    if (!b) return;
    for (const pi of paths) {
      const full = b + pi;
      if (!seen[full]) {
        seen[full] = 1;
        out.push(full);
      }
    }
  }

  let backendOrigin = "";
  try {
    const pc = window.__PING_PORTONE_CONFIG__ || {};
    backendOrigin = String(pc.backendApiOrigin || "")
      .trim()
      .replace(/\/+$/, "");
  } catch {
    /* ignore */
  }

  try {
    if (window.location.protocol === "file:") {
      addBase("http://localhost:3000");
      addBase("http://127.0.0.1:3000");
      if (backendOrigin) addBase(backendOrigin);
      return out;
    }
    /** Vercel/Next·Express — UI와 같은 출처 API 우선 (Firebase 원격은 폴백) */
    addBase(window.location.origin);
    if (backendOrigin && backendOrigin !== window.location.origin.replace(/\/+$/, "")) {
      addBase(backendOrigin);
    }
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      addBase("http://localhost:3000");
      addBase("http://127.0.0.1:3000");
    }
  } catch {
    addBase("http://localhost:3000");
  }
  return out;
}

export function fetchBugoImportWithFallback(normalized: string): Promise<{
  res: Response;
  data: BugoImportApiData;
}> {
  const urls = getBugoImportApiUrlCandidates();
  function step(i: number): Promise<{ res: Response; data: Record<string, unknown> }> {
    if (i >= urls.length) {
      return Promise.reject(
        new Error(
          "부고 가져오기 API에 연결하지 못했습니다. `npm run dev`로 서버(기본 3000)를 실행했는지 확인하거나, 정적 사이트만 쓰는 경우 서버 .env에 PING_BACKEND_API_ORIGIN을 넣어 주세요.",
        ),
      );
    }
    const apiUrl = urls[i];
    return fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalized }),
    }).then(
      (res) =>
        res.text().then((text) => {
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(text) as Record<string, unknown>;
          } catch {
            const looksHtml =
              /^\s*</.test(text) ||
              text.includes("<!DOCTYPE") ||
              text.includes("<!doctype");
            if (looksHtml && i + 1 < urls.length) {
              return step(i + 1);
            }
            throw new Error(
              "서버가 JSON 대신 웹 페이지를 돌려줬습니다. 같은 PC에서 `npm run dev`(기본 포트 3000)로 열었는지 확인해 주세요.",
            );
          }
          const ok = res.ok && data.ok === true;
          if (!ok && i + 1 < urls.length) {
            return step(i + 1);
          }
          return { res, data };
        }),
      (fetchErr) => {
        if (i + 1 < urls.length) return step(i + 1);
        return Promise.reject(fetchErr);
      },
    );
  }
  return step(0) as Promise<{ res: Response; data: BugoImportApiData }>;
}

export function isBugoFuneralImportUrl(raw: string): boolean {
  return isSupportedFuneralImportUrl(raw);
}

export function shouldSkipBugoImportForUrl(
  normalized: string,
  lastImportedUrl: string,
): boolean {
  if (!normalized || !isBugoFuneralImportUrl(normalized)) return false;
  if (lastImportedUrl === normalized) return true;
  try {
    const prev = readPingFromIndexRecord();
    const bi = prev.bugoImport as { url?: string } | undefined;
    if (!bi || !bi.url) return false;
    if (normalizeExternalObituaryUrl(String(bi.url)) !== normalized) return false;
    const draft = prev.bulkSmsMessageDraft;
    if (draft != null && String(draft).trim().length > 0) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function computeBulkSmsTitleFromParsed(
  parsed: { deceasedName?: string } | undefined,
  messageBody: string,
): string {
  let dn = parsed && parsed.deceasedName ? String(parsed.deceasedName) : "";
  dn = dn.replace(/^故\s*/, "").trim();
  if (!dn && messageBody) {
    const mb = String(messageBody);
    const m1 = mb.match(/^故\s*([^(]+?)님(?:\(|(\r?\n)|$)/);
    if (m1) dn = String(m1[1] || "").replace(/^故\s*/, "").trim();
  }
  if (!dn && messageBody) {
    const mb = String(messageBody);
    const m2 = mb.match(/故\s*([^\s\r\n(]+?)(?:님|\(|$|\r|\n)/);
    if (m2) dn = String(m2[1] || "").replace(/님$/, "").trim();
  }
  if (dn) {
    return ("故 " + dn + "님의 부고를 전해드립니다.").slice(0, 40);
  }
  if (messageBody && String(messageBody).trim()) {
    const first = String(messageBody)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find((s) => s.length > 0);
    if (first) {
      const clipped = first.replace(/\s+/g, " ").slice(0, 22);
      const suffix = first.length > 22 ? "… " : " ";
      return (clipped + suffix + "부고 안내").slice(0, 40);
    }
  }
  return "삼가 부고를 전해드립니다.".slice(0, 40);
}

export function persistObituaryUrlToPingFromIndex(normalized: string) {
  const prev = readPingFromIndexRecord();
  const prevNorm = normalizeExternalObituaryUrl(String(prev.obituaryPageUrl || ""));
  if (prevNorm && prevNorm !== normalized) {
    delete prev.bugoImport;
    prev.bulkSmsMessageDraft = "";
    prev.bulkSmsTitle = "";
    delete prev.bulkSmsTemplate1Snapshot;
    delete prev.bulkSmsTemplate2Snapshot;
  }
  prev.obituaryPageUrl = normalized;
  prev.bulkFlowKind = "obituary";
  prev.smsTemplateId = (prev.smsTemplateId as string) || "1";
  writePingFromIndexRecord(prev);
}

/** `index.html` `indexPersistBulkSmsComposeToSession` — 문자 단계 → 연락처 단계 전 세션 동기화 */
export function persistBulkSmsComposeToPingFromIndex(opts: {
  title: string;
  body: string;
  templateId: BulkSmsTemplateId;
  obituaryPageUrl?: string;
  bulkFlowKind?: "obituary" | "thankyou";
}): void {
  const prev = readPingFromIndexRecord();
  const kind = opts.bulkFlowKind === "thankyou" ? "thankyou" : "obituary";
  prev.bulkSmsTitle = String(opts.title || "").slice(0, 40);
  prev.bulkSmsMessageDraft = sanitizeBulkSmsBodyText(opts.body);
  prev.smsTemplateId = opts.templateId === "2" ? "2" : "1";
  prev.bulkFlowKind = kind;
  if (kind === "thankyou") {
    prev.obituaryPageUrl = "";
  } else if (opts.obituaryPageUrl) {
    prev.obituaryPageUrl = opts.obituaryPageUrl;
  }
  writePingFromIndexRecord(prev);
}

export function applyBugoImportToPingFromIndex(
  normalized: string,
  data: {
    url?: string;
    messageBody?: string;
    messageBodyTemplate2?: string;
    parsed?: { deceasedName?: string };
  },
) {
  let msgB = data.messageBody;
  if (msgB && normalized) msgB = String(msgB).replace(/\{\{LINK\}\}/g, normalized);
  const msgClean =
    msgB && String(msgB).trim() ? sanitizeBulkSmsBodyText(msgB) : "";
  const parsedB = data.parsed;
  const title = computeBulkSmsTitleFromParsed(parsedB, msgClean);
  const prev = readPingFromIndexRecord();
  prev.obituaryPageUrl = normalized;
  prev.bugoImport = { url: data.url, at: Date.now(), parsed: data.parsed };
  prev.smsTemplateId = "1";
  if (msgClean) prev.bulkSmsTemplate1Snapshot = msgClean;
  let t2 = data.messageBodyTemplate2;
  if (t2 && normalized) t2 = String(t2).replace(/\{\{LINK\}\}/g, normalized);
  const t2Clean =
    t2 && String(t2).trim() ? sanitizeBulkSmsBodyText(String(t2)) : "";
  if (t2Clean) prev.bulkSmsTemplate2Snapshot = t2Clean;
  if (msgClean) prev.bulkSmsMessageDraft = msgClean;
  prev.bulkSmsTitle = title;
  prev.bulkFlowKind = "obituary";
  writePingFromIndexRecord(prev);
}

export async function tryBugoImportForUrl(
  normalized: string,
  lastImportedUrl: string,
  importInFlight: { current: boolean },
): Promise<{ skipped: boolean; imported: boolean }> {
  if (!isBugoFuneralImportUrl(normalized)) {
    return { skipped: true, imported: false };
  }
  if (shouldSkipBugoImportForUrl(normalized, lastImportedUrl)) {
    return { skipped: true, imported: false };
  }
  if (importInFlight.current) {
    return { skipped: true, imported: false };
  }
  importInFlight.current = true;
  try {
    const pair = await fetchBugoImportWithFallback(normalized);
    const data = pair.data;
    if (!pair.res.ok || !data.ok) {
      throw new Error(String(data.error || "가져오기에 실패했습니다."));
    }
    applyBugoImportToPingFromIndex(normalized, {
      url: data.url,
      messageBody: data.messageBody,
      messageBodyTemplate2: data.messageBodyTemplate2,
      parsed: data.parsed,
    });
    return { skipped: false, imported: true };
  } finally {
    importInFlight.current = false;
  }
}
