"use client";

import { BulkFlowProgress } from "@/components/bulk/bulk-flow-progress";
import { PingLoadingSpinner } from "@/components/ping-loading-spinner";
import { BULK_FLOW_NINE_COPY } from "@/lib/ping-flow-step-copy";
import { useFontAwesomeCdn } from "@/hooks/use-font-awesome-cdn";
import { navigateToBulkCheckoutPrepare } from "@/lib/ping-bulk-checkout-prep";
import {
  bulkFlowBackAriaLabel,
  navigateBulkFlowBack,
} from "@/lib/ping-bulk-flow-nav";
import { pingAssignToLocation } from "@/lib/ping-nav-home";
import { PING_BULK_STANDARD_SEND_FEE } from "@/lib/ping-bulk-pricing";
import { fetchPingSendFromLabel } from "@/lib/ping-send-from-client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import "./payments.css";

const KEY_ROUTE = "ping_flow_route";
const KEY_STARTED = "ping_flow_started";
const ROUTE_BULK_DIRECT = "bulk_direct";

function safeParse(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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

function loadSession(): {
  recipients: unknown[];
  flags: Record<string, unknown>;
  fromIndex: Record<string, unknown>;
} {
  const recipients = safeParse(sessionStorage.getItem("ping_bulk_recipients"));
  const flags = safeParse(sessionStorage.getItem("ping_bulk_flags"));
  const fromIndex = safeParse(sessionStorage.getItem("ping_from_index"));
  return {
    recipients: Array.isArray(recipients) ? recipients : [],
    flags: (flags && typeof flags === "object" ? flags : {}) as Record<string, unknown>,
    fromIndex: (fromIndex && typeof fromIndex === "object"
      ? fromIndex
      : {}) as Record<string, unknown>,
  };
}

export default function SendPaymentsClient() {
  const router = useRouter();
  useFontAwesomeCdn();
  const [urlCopied, setUrlCopied] = useState(false);
  const [sendFromLabel, setSendFromLabel] = useState("PING 대표번호");
  const [state, setState] = useState<{
    recipients: unknown[];
    flags: Record<string, unknown>;
    fromIndex: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    setState(loadSession());
  }, []);

  useEffect(() => {
    void fetchPingSendFromLabel().then(setSendFromLabel);
  }, []);

  useEffect(() => {
    if (!state) return;
    if (!state.recipients || state.recipients.length === 0) {
      alert("주소록 정보가 없습니다.\n처음부터 다시 진행해 주세요.");
      pingAssignToLocation("/");
    }
  }, [state]);

  const count = state?.recipients.length ?? 0;
  const total = count * PING_BULK_STANDARD_SEND_FEE;

  const isThankYou =
    state &&
    (state.flags.bulkFlowKind === "thankyou" ||
      state.fromIndex.bulkFlowKind === "thankyou");

  const obituaryUrl =
    state && !isThankYou
      ? (state.fromIndex.obituaryPageUrl as string | undefined)
      : null;
  const draft = state?.fromIndex.bulkSmsMessageDraft as string | undefined;

  const gotoIdentityVerification = useCallback(() => {
    setFlowRoute(ROUTE_BULK_DIRECT);
    markFlowStarted();
    let identityOk = false;
    try {
      identityOk = sessionStorage.getItem("ping_bulk_identity_ok") === "1";
    } catch {
      /* ignore */
    }
    if (identityOk) {
      navigateToBulkCheckoutPrepare();
      return;
    }
    try {
      sessionStorage.removeItem("ping_bulk_identity_ok");
    } catch {
      /* ignore */
    }
    router.push("/login");
  }, [router]);

  const copyObituaryUrl = useCallback(async () => {
    const u = String(obituaryUrl || "").trim();
    if (!u) return;
    try {
      await navigator.clipboard.writeText(u);
      setUrlCopied(true);
      window.setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      window.prompt("부고 주소를 복사하세요", u);
    }
  }, [obituaryUrl]);

  const gotoPrev = useCallback(() => {
    navigateBulkFlowBack(4);
  }, []);

  if (state === null) {
    return (
      <div className="ping-shell payments-flow-shell flex justify-center" style={{ padding: 24 }}>
        <PingLoadingSpinner label="불러오는 중" />
      </div>
    );
  }

  if (!state.recipients || state.recipients.length === 0) {
    return null;
  }

  return (
    <div className="ping-shell payments-flow-shell flex min-h-0 flex-1 flex-col">
      <header className="ping-top-nav">
        <button
          type="button"
          className="ping-top-nav__back ping-back-btn touch-manipulation"
          aria-label={bulkFlowBackAriaLabel(4)}
          onClick={gotoPrev}
        >
          <span className="ping-chevron-left" aria-hidden />
        </button>
        <h1 className="ping-top-nav__title">{BULK_FLOW_NINE_COPY[4].title}</h1>
      </header>

      <BulkFlowProgress currentStep={4} />

      <main
        className="ping-main ping-main--tight-top flex min-h-0 flex-1 flex-col"
        style={{ paddingTop: 12 }}
      >
        <div
          id="review-card"
          className="review-card ping-bordered-panel flex min-w-0 max-w-full flex-col gap-3 p-5"
          aria-label="발송 요약"
        >
          <p className="review-summary-lead">{BULK_FLOW_NINE_COPY[4].subtitle}</p>
          <div className="review-row">
            <span>받는 사람</span>
            <strong>
              <span>{count.toLocaleString("ko-KR")}</span>건
            </strong>
          </div>
          <div className="review-row">
            <span>발송비</span>
            <strong>
              <span>{total.toLocaleString("ko-KR")}</span>원
            </strong>
          </div>
          <div className="review-row">
            <span>발신번호</span>
            <strong>{sendFromLabel}</strong>
          </div>
          {!isThankYou ? (
            <div className="review-row review-row--url" id="review-url-row">
              <span className="review-row__label">부고 주소</span>
              <div className="review-url-wrap">
                <strong className="review-url">{obituaryUrl || "—"}</strong>
                {obituaryUrl ? (
                  <button
                    type="button"
                    className="review-url-copy-btn touch-manipulation"
                    aria-label={urlCopied ? "복사됨" : "부고 주소 복사"}
                    title={urlCopied ? "복사됨" : "복사"}
                    onClick={() => void copyObituaryUrl()}
                  >
                    <i
                      className={urlCopied ? "fas fa-check" : "far fa-copy"}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="review-row total">
            <strong>총 결제금액</strong>
            <span className="amount">
              <span>{total.toLocaleString("ko-KR")}</span>원
            </span>
          </div>
          <p className="review-foot-note">
            번호 있는 행만 집계 · 단가 {PING_BULK_STANDARD_SEND_FEE}원
          </p>
        </div>

        {draft ? (
          <div
            className="review-preview-panel ping-bordered-panel mt-[18px] flex min-w-0 max-w-full flex-col gap-3 p-5"
            aria-label="발송 본문 미리보기"
          >
            <p className="review-preview-label">발송 본문 미리보기</p>
            <div className="review-preview">{String(draft)}</div>
          </div>
        ) : null}

        <div className="review-cta-row mt-auto">
          <button
            type="button"
            className="ping-btn-primary touch-manipulation"
            onClick={gotoIdentityVerification}
          >
            다음
          </button>
        </div>
      </main>
    </div>
  );
}
