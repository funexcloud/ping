"use client";

import { pingAssignToLocation } from "@/lib/ping-nav-home";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import "./send-url.css";

const PING_FROM_INDEX = "ping_from_index";
const KEY_ROUTE = "ping_flow_route";
const KEY_STARTED = "ping_flow_started";
const ROUTE_BULK_DIRECT = "bulk_direct";

function setFlowRoute(route: string) {
  try {
    sessionStorage.setItem(KEY_ROUTE, String(route || ""));
  } catch {
    /* ignore */
  }
}

function markFlowStarted() {
  try {
    sessionStorage.setItem(KEY_STARTED, "1");
  } catch {
    /* ignore */
  }
}

function getBugoImportApiUrlCandidates(): string[] {
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
  try {
    const pc = window.__PING_PORTONE_CONFIG__ || {};
    const cfgBo = String(pc.backendApiOrigin || "")
      .trim()
      .replace(/\/+$/, "");
    if (cfgBo) addBase(cfgBo);
  } catch {
    /* ignore */
  }
  try {
    if (window.location.protocol === "file:") {
      addBase("http://localhost:3000");
      addBase("http://127.0.0.1:3000");
      return out;
    }
    addBase(window.location.origin);
    addBase("http://localhost:3000");
    addBase("http://127.0.0.1:3000");
  } catch {
    addBase("http://localhost:3000");
  }
  return out;
}

function fetchBugoImportWithFallback(normalized: string): Promise<{
  res: Response;
  data: { ok?: boolean; error?: string; url?: string; messageBody?: string; messageBodyTemplate2?: string; parsed?: unknown };
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
          return { res, data };
        }),
      (fetchErr) => {
        if (i + 1 < urls.length) return step(i + 1);
        return Promise.reject(fetchErr);
      },
    );
  }
  return step(0);
}

function extractFirstHttpsUrl(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const m = String(raw).match(/https:\/\/[^\s<>"')\]}]+/i);
  if (!m) return null;
  return m[0].replace(/[.,;]+$/g, "");
}

function normalizeExternalObituaryUrl(raw: string | null | undefined): string {
  const extracted = extractFirstHttpsUrl(raw);
  if (extracted) return extracted;
  return String(raw == null ? "" : raw)
    .replace(/\s/g, "")
    .trim();
}

function isValidExternalObituaryUrl(s: string): boolean {
  if (!s || /\s/.test(s)) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

function isBugoFuneralImportUrl(raw: string): boolean {
  if (!raw || typeof raw !== "string") return false;
  try {
    const u = new URL(String(raw).trim());
    const h = u.hostname.toLowerCase();
    if (h === "wooribugo4.com" || h === "www.wooribugo4.com") {
      return u.pathname.toLowerCase().includes("/page/funeral/view");
    }
    if (h === "modubugo.com" || h === "www.modubugo.com") {
      return /^\/bugo\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(
        u.pathname,
      );
    }
    return false;
  } catch {
    return false;
  }
}

function sanitizeBulkSmsBodyText(s: string): string {
  let t = String(s || "");
  t = t.replace(/삼가\s*고인의\s*명복을\s*빕니다\.?/g, "삼가 명복을 빕니다.");
  t = t.replace(/(^|\r?\n)(\s*)고인\s+/gm, "$1$2");
  return t;
}

function readPingFromIndex(): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem(PING_FROM_INDEX);
    return raw ? ((JSON.parse(raw) as Record<string, unknown>) || {}) : {};
  } catch {
    return {};
  }
}

function writePingFromIndex(prev: Record<string, unknown>) {
  try {
    prev.ts = Date.now();
    sessionStorage.setItem(PING_FROM_INDEX, JSON.stringify(prev));
  } catch (e) {
    console.warn("ping_from_index 저장 실패", e);
  }
}

function shouldSkipBugoImportForUrl(normalized: string, lastImportedUrl: string): boolean {
  if (!normalized || !isBugoFuneralImportUrl(normalized)) return false;
  if (lastImportedUrl === normalized) return true;
  try {
    const prev = readPingFromIndex();
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

function computeBulkSmsTitleFromParsed(
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

function persistObituaryUrlOnly(prev: Record<string, unknown>, normalized: string) {
  prev.obituaryPageUrl = normalized;
  prev.bulkFlowKind = "obituary";
  prev.smsTemplateId = (prev.smsTemplateId as string) || "1";
  writePingFromIndex(prev);
}

function applyBugoImportToSession(
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
  const prev = readPingFromIndex();
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
  writePingFromIndex(prev);
}

export default function SendUrlClient() {
  const [urlValue, setUrlValue] = useState("");
  const [hintHidden, setHintHidden] = useState(true);
  const [hintText, setHintText] = useState(
    "https:// 로 시작하는 부고 페이지 주소만 사용할 수 있습니다. 긴 문자를 붙여넣어도 그 안의 https 링크만 남습니다.",
  );
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const importInFlight = useRef(false);
  const lastImportedUrl = useRef("");

  useEffect(() => {
    window.__PING_PORTONE_CONFIG__ = window.__PING_PORTONE_CONFIG__ || {};
    setFlowRoute(ROUTE_BULK_DIRECT);
    markFlowStarted();
  }, []);

  useEffect(() => {
    try {
      const prev0 = readPingFromIndex();
      if (prev0.obituaryPageUrl && !prev0.bulkFlowKind) prev0.bulkFlowKind = "obituary";
      if (prev0.obituaryPageUrl) {
        const u = String(prev0.obituaryPageUrl);
        setUrlValue(u);
        lastImportedUrl.current = normalizeExternalObituaryUrl(u);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const updateHint = useCallback((raw: string) => {
    if (!String(raw).trim()) {
      setHintHidden(true);
      return;
    }
    const v = normalizeExternalObituaryUrl(raw);
    if (isValidExternalObituaryUrl(v)) {
      setHintHidden(true);
      return;
    }
    setHintText(
      "https:// 로 시작하는 부고 페이지 주소만 사용할 수 있습니다. 긴 문자를 붙여넣어도 그 안의 https 링크만 남습니다.",
    );
    setHintHidden(false);
  }, []);

  const onInput = (raw: string) => {
    setUrlValue(raw);
    const v = normalizeExternalObituaryUrl(raw);
    if (!isBugoFuneralImportUrl(v)) lastImportedUrl.current = "";
    updateHint(raw);
  };

  const tryImportFromField = useCallback(async (currentUrl: string) => {
    const normalized = normalizeExternalObituaryUrl(currentUrl);
    if (!isBugoFuneralImportUrl(normalized)) return;
    if (shouldSkipBugoImportForUrl(normalized, lastImportedUrl.current)) {
      lastImportedUrl.current = normalized;
      setStatus("이미 가져온 부고 링크입니다.");
      return;
    }
    if (importInFlight.current) return;
    importInFlight.current = true;
    setLoading(true);
    setStatus("부고 페이지에서 본문을 가져오는 중…");
    try {
      const pair = await fetchBugoImportWithFallback(normalized);
      const data = pair.data;
      if (!pair.res.ok || !data.ok) {
        throw new Error(String(data.error || "가져오기에 실패했습니다."));
      }
      applyBugoImportToSession(normalized, {
        url: data.url,
        messageBody: data.messageBody,
        messageBodyTemplate2: data.messageBodyTemplate2,
        parsed: data.parsed as { deceasedName?: string } | undefined,
      });
      lastImportedUrl.current = normalized;
      setStatus("본문을 반영했습니다. 다음에서 문자를 확인·수정하세요.");
    } catch (err: unknown) {
      console.warn("bugo import", err);
      const msg = err instanceof Error ? err.message : "스크래핑 연동에 실패했습니다.";
      alert(msg);
      throw err;
    } finally {
      importInFlight.current = false;
      setLoading(false);
    }
  }, []);

  const onBlur = () => {
    const v = normalizeExternalObituaryUrl(urlValue);
    setUrlValue(v);
    updateHint(v);
    queueMicrotask(() => {
      tryImportFromField(v).catch(() => {});
    });
  };

  const onPaste = (ev: React.ClipboardEvent<HTMLInputElement>) => {
    const text = ev.clipboardData?.getData("text") || "";
    if (!text) return;
    ev.preventDefault();
    const v = extractFirstHttpsUrl(text) || "";
    setUrlValue(v);
    onInput(v);
    if (String(text).trim() && !v) {
      setHintText(
        "붙여넣은 내용에 https:// 로 시작하는 주소가 없습니다. 부고 페이지의 https 링크를 복사해 주세요.",
      );
      setHintHidden(false);
    }
    queueMicrotask(() => {
      tryImportFromField(v).catch(() => {});
    });
  };

  const onNext = () => {
    const v = normalizeExternalObituaryUrl(urlValue);
    setUrlValue(v);
    updateHint(v);
    if (!isValidExternalObituaryUrl(v)) {
      alert("부고 주소(https)를 확인해 주세요.");
      return;
    }
    tryImportFromField(v)
      .then(() => {
        const prev = readPingFromIndex();
        persistObituaryUrlOnly(prev, v);
        pingAssignToLocation("/start?bulkAfterUrl=1");
      })
      .catch(() => {});
  };

  return (
    <>
      <Script
        id="ping-portone-config"
        src="/api/portone-config.js"
        strategy="afterInteractive"
      />
      <div className="ping-shell">
        <header className="ping-top-nav ping-top-nav--blend">
          <button
            type="button"
            className="ping-top-nav__back ping-back-btn touch-manipulation"
            aria-label="이전"
            onClick={() => pingAssignToLocation("/")}
          >
            <span className="ping-chevron-left" aria-hidden />
          </button>
          <h1 className="ping-top-nav__title">부고 주소 입력</h1>
        </header>

        <main className="ping-main ping-main--tight-top">
          <div>
            <input
              type="text"
              id="send-url-field"
              inputMode="url"
              autoComplete="url"
              className="input-field ping-field-standard w-full max-w-full min-w-0 touch-manipulation"
              placeholder="https:// 로 시작하는 부고 주소 (긴 메시지 통째로 붙여넣기 가능)"
              aria-label="부고 페이지 주소"
              value={urlValue}
              onChange={(e) => onInput(e.target.value)}
              onBlur={onBlur}
              onPaste={onPaste}
            />
            <p
              id="send-url-hint"
              className={`ping-input-hint is-error ${hintHidden ? "hidden" : ""}`}
              role="status"
            >
              {!hintHidden ? hintText : ""}
            </p>
          </div>
          <p id="send-url-status" className="ping-input-hint" role="status" aria-live="polite">
            {status}
          </p>

          <button type="button" className="ping-btn-primary touch-manipulation" onClick={onNext}>
            다음 · 문자 작성
          </button>
        </main>
      </div>

      <div
        id="send-url-loading"
        className={`send-url-loading ${loading ? "" : "hidden"}`}
        aria-hidden={!loading}
        aria-busy={loading}
      >
        <div className="send-url-loading__card">부고 페이지에서 정보를 가져오는 중…</div>
      </div>
    </>
  );
}
