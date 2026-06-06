"use client";

import {
  bulkFlowBackAriaLabel,
  navigateBulkFlowBack,
} from "@/lib/ping-bulk-flow-nav";
import Script from "next/script";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PING_BULK_PREPARE_CHECKOUT_KEY,
  PING_CHECKOUT_SESSION,
  prepareBulkCheckoutAfterIdentity,
} from "@/lib/ping-bulk-checkout-prep";
import { loadBulkRecipientsCount } from "@/lib/ping-bulk-session";
import { BulkFlowProgress } from "@/components/bulk/bulk-flow-progress";
import { CheckoutMemberWelcomeSheet } from "@/components/checkout/checkout-member-welcome-sheet";
import { PingLoadingSpinner } from "@/components/ping-loading-spinner";
import { PingBankAccountCopyAllButton } from "@/components/ping-bank-account-copy-all-button";
import { PingBankAccountCopyButton } from "@/components/ping-bank-account-copy-button";
import { Building2, CreditCard } from "lucide-react";
import { BULK_FLOW_NINE_COPY } from "@/lib/ping-flow-step-copy";
import { PING_BANK_TRANSFER } from "@/lib/ping-bank-transfer-checkout";
import {
  destroyCheckoutPage,
  initCheckoutPage,
  startCheckoutPayment,
  syncCheckoutPayButton,
} from "./checkout-page-logic";
import "./checkout.css";

/**
 * 외부 스크립트(toss, portone-config, referral)가 모두 준비된 뒤 한 번만 마운트한다.
 * React Strict Mode 이중 effect 대비.
 */
export function CheckoutClient() {
  const [tossReady, setTossReady] = useState(false);
  const [referralReady, setReferralReady] = useState(false);
  const [portoneReady, setPortoneReady] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const prepareStartedRef = useRef(false);

  function readHasCheckoutSession(): boolean {
    try {
      const raw = sessionStorage.getItem(PING_CHECKOUT_SESSION);
      if (!raw) return false;
      const s = JSON.parse(raw) as { orderId?: string; amount?: unknown };
      return !!(String(s?.orderId || "").trim() && s.amount != null);
    } catch {
      return false;
    }
  }

  function shouldRunBulkCheckoutPrepare(): boolean {
    if (readHasCheckoutSession()) return false;
    try {
      if (sessionStorage.getItem(PING_BULK_PREPARE_CHECKOUT_KEY) === "1") return true;
      if (
        sessionStorage.getItem("ping_bulk_identity_ok") === "1" &&
        loadBulkRecipientsCount() > 0
      ) {
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  useEffect(() => {
    if (!tossReady || !referralReady || !portoneReady) return;
    let cancelled = false;
    void (async () => {
      if (shouldRunBulkCheckoutPrepare() && !prepareStartedRef.current) {
        prepareStartedRef.current = true;
        try {
          await prepareBulkCheckoutAfterIdentity();
          try {
            sessionStorage.removeItem(PING_BULK_PREPARE_CHECKOUT_KEY);
          } catch {
            /* ignore */
          }
        } catch (e) {
          prepareStartedRef.current = false;
          window.alert(
            e instanceof Error ? e.message : "결제 준비에 실패했습니다.",
          );
          window.location.href = "/send/payments";
          return;
        }
      }

      await initCheckoutPage();
      if (!cancelled) setCheckoutReady(true);
    })();
    return () => {
      cancelled = true;
      destroyCheckoutPage();
      setCheckoutReady(false);
    };
  }, [tossReady, referralReady, portoneReady]);

  useLayoutEffect(() => {
    if (!checkoutReady) return;
    syncCheckoutPayButton();
  });

  return (
    <>
      <Script
        src="https://js.tosspayments.com/v2/standard"
        strategy="afterInteractive"
        onLoad={() => setTossReady(true)}
      />
      <Script
        src="/api/portone-config.js"
        strategy="afterInteractive"
        onLoad={() => setPortoneReady(true)}
        onError={() => {
          if (typeof window !== "undefined") {
            window.__PING_PORTONE_CONFIG_SCRIPT_ERROR__ = 1;
          }
          setPortoneReady(true);
        }}
      />
      <Script
        src="/assets/js/ping-referral-points.js"
        strategy="afterInteractive"
        onLoad={() => setReferralReady(true)}
      />

      <div className="app-shell checkout-shell relative flex min-h-0 w-full flex-1 flex-col overflow-x-hidden bg-white">
          <header className="ping-top-nav">
            <button
              type="button"
              className="ping-top-nav__back ping-back-btn touch-manipulation"
              aria-label={bulkFlowBackAriaLabel(6)}
              onClick={() => navigateBulkFlowBack(6)}
            >
              <span className="ping-chevron-left" aria-hidden="true" />
            </button>
            <h1 className="ping-top-nav__title">{BULK_FLOW_NINE_COPY[6].title}</h1>
          </header>

          <BulkFlowProgress currentStep={6} />

          <main className="flex-1 min-w-0 px-5 pb-4 pt-4" id="checkout-main">
            <div className="checkout-summary-panel ping-bordered-panel mb-5 min-w-0 max-w-full p-4">
              <p className="checkout-summary-lead m-0 text-[14px] leading-relaxed text-[#6B7684]">
                {BULK_FLOW_NINE_COPY[6].subtitle}
              </p>
              <p
                hidden
                className="checkout-portone-banner mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-900"
                id="checkout-portone-api-banner"
              />
              <div className="checkout-summary-rows mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">주문번호</span>
                  <span
                    className="break-all text-right font-mono text-[13px] text-gray-900"
                    id="checkout-order-id"
                  >
                    —
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">상품</span>
                  <span className="text-right font-medium text-gray-900" id="checkout-order-name">
                    —
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">발송 방식</span>
                  <span className="text-right font-medium text-gray-900" id="checkout-send-channel">
                    —
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">발신번호</span>
                  <span className="text-right font-medium text-gray-900" id="checkout-send-from">
                    —
                  </span>
                </div>
                <div className="flex justify-between gap-2 pt-1">
                  <span className="font-semibold text-gray-800">주문 금액</span>
                  <span className="text-lg font-extrabold text-[var(--ping-primary)]" id="checkout-amount">
                    —
                  </span>
                </div>
              </div>
            </div>

            <div
              className="checkout-points-panel ping-bordered-panel mb-5 min-w-0 max-w-full space-y-3 p-4 text-sm"
              id="checkout-points-box"
            >
              <p
                id="checkout-points-balance-line"
                className="checkout-points-balance-line m-0 text-[14px] leading-relaxed text-[#6B7684]"
              >
                내 포인트는{" "}
                <span id="checkout-pt-balance" className="font-semibold tabular-nums text-gray-900">
                  0
                </span>
                P가 있어요. 발송에 사용하면 차감돼요.
              </p>
              <div className="checkout-points-input-wrap min-w-0 max-w-full">
                <label
                  htmlFor="checkout-points-input"
                  className="mb-1.5 block text-xs font-medium text-gray-700"
                >
                  사용 포인트
                </label>
                <input
                  type="number"
                  id="checkout-points-input"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  defaultValue={0}
                  placeholder="0"
                  className="checkout-points-input input-field ping-field-standard ping-field-numeric w-full max-w-full min-w-0 touch-manipulation"
                />
              </div>
              <div className="flex justify-between gap-2 pt-1">
                <span className="font-medium text-gray-600">포인트 차감</span>
                <span className="font-semibold tabular-nums text-gray-900" id="checkout-points-deduct-line">
                  0P
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-gray-800">카드·간편결제 금액</span>
                <span
                  className="text-lg font-extrabold tabular-nums text-[var(--ping-primary)]"
                  id="checkout-card-amount-line"
                >
                  —
                </span>
              </div>
            </div>

            <div
              className="checkout-error-panel ping-bordered-panel mb-4 hidden min-w-0 max-w-full p-4 text-sm text-red-800"
              id="checkout-error"
            />

            <div
              className="checkout-agree-panel ping-bordered-panel mb-4 hidden min-w-0 max-w-full p-4"
              id="checkout-points-only-agree-wrap"
            >
              <label className="flex cursor-pointer touch-manipulation items-start gap-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  id="checkout-points-only-agree"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0336FF] focus:ring-[#0336FF]"
                />
                <span>
                  <span className="font-bold text-red-600">(필수)</span> 결제·서비스 이용 및 개인정보 처리에
                  동의합니다.
                </span>
              </label>
            </div>

            <div
              className="checkout-widget-panel ping-bordered-panel mb-4 min-w-0 max-w-full space-y-4 p-4"
              id="ping-ui-widget-wrap"
            >
              <div
                className="checkout-pg-review-notice rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-950"
                role="status"
              >
                <p className="m-0 font-semibold">PG 심사중이에요.</p>
                <p className="m-0 mt-1 text-xs text-amber-900/90">
                  PG 심사 완료 전까지는 아래 무통장 입금만 이용할 수 있어요.
                  <br />
                  무통장 입금시 가입자, 주문자명과 동일하게 입금 부탁드려요.
                </p>
              </div>

              <div
                className="checkout-pay-method-tabs"
                role="radiogroup"
                aria-label="결제 수단 선택"
              >
                <button
                  type="button"
                  className="checkout-pay-method-tab is-active"
                  data-checkout-pay-method="bank"
                  aria-pressed="true"
                >
                  <Building2 className="checkout-pay-method-tab__icon" aria-hidden />
                  <span>무통장 입금</span>
                </button>
                <button
                  type="button"
                  className="checkout-pay-method-tab"
                  data-checkout-pay-method="card"
                  aria-pressed="false"
                >
                  <CreditCard className="checkout-pay-method-tab__icon" aria-hidden />
                  <span>카드·간편결제</span>
                </button>
              </div>

              <div id="checkout-bank-transfer-panel" className="checkout-bank-panel space-y-3">
                <div className="checkout-bank-info-card space-y-2.5 rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 text-sm text-gray-800">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">은행</span>
                    <span className="font-medium" id="checkout-bank-name">
                      {PING_BANK_TRANSFER.bankName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="shrink-0 text-gray-500">계좌</span>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-mono font-semibold" id="checkout-bank-account">
                        {PING_BANK_TRANSFER.accountNumber}
                      </span>
                      <PingBankAccountCopyButton />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">예금주</span>
                    <span className="font-medium" id="checkout-bank-holder">
                      {PING_BANK_TRANSFER.holder}
                    </span>
                  </div>
                </div>
                <PingBankAccountCopyAllButton />

                <div className="checkout-cash-receipt-block space-y-2.5 rounded-xl border border-gray-200 bg-white p-3.5">
                  <p className="m-0 text-sm font-semibold text-gray-900">현금영수증 (필수)</p>
                  <p className="m-0 text-xs leading-relaxed text-gray-500">
                    발급 완료 이후 수정은 고객센터로 문의바랍니다.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                      <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm has-[:checked]:border-[#0336FF] has-[:checked]:bg-[#0336FF]/5">
                        <input
                          type="radio"
                          name="checkout-cash-receipt-choice"
                          value="income_deduction"
                          defaultChecked
                          className="text-[#0336FF] focus:ring-[#0336FF]"
                        />
                        <span>소득공제용 (휴대폰)</span>
                      </label>
                      <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm has-[:checked]:border-[#0336FF] has-[:checked]:bg-[#0336FF]/5">
                        <input
                          type="radio"
                          name="checkout-cash-receipt-choice"
                          value="expense_proof"
                          className="text-[#0336FF] focus:ring-[#0336FF]"
                        />
                        <span>지출증빙용 (사업자)</span>
                      </label>
                    </div>
                    <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm has-[:checked]:border-[#0336FF] has-[:checked]:bg-[#0336FF]/5">
                      <input
                        type="radio"
                        name="checkout-cash-receipt-choice"
                        value="voluntary"
                        id="checkout-cash-receipt-voluntary"
                        className="text-[#0336FF] focus:ring-[#0336FF]"
                      />
                      <span
                        id="checkout-cash-receipt-voluntary-hint"
                        className="text-gray-800"
                      >
                        국세청 010-0000-1234 자진발급
                      </span>
                    </label>
                  </div>
                  <div id="checkout-cash-receipt-number-wrap">
                    <input
                      type="text"
                      id="checkout-cash-receipt-number"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="휴대폰 번호 (예: 01012345678)"
                      className="input-field ping-field-standard w-full max-w-full min-w-0"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer touch-manipulation items-start gap-3 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    id="checkout-bank-agree"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0336FF] focus:ring-[#0336FF]"
                  />
                  <span>
                    <span className="font-bold text-red-600">(필수)</span> 무통장 입금 예정 및 결제·서비스 이용
                    약관에 동의합니다.
                  </span>
                </label>
              </div>

              <div
                id="ping-payment-methods"
                className="hidden min-h-[100px] min-w-0 max-w-full"
              />
              <div
                id="ping-payment-agreement"
                className="hidden min-h-[72px] min-w-0 max-w-full"
              />
            </div>
          </main>

          <div
            id="checkout-pay-container"
            className="checkout-pay-bar safe-area shrink-0 border-t border-gray-200/80 bg-white/95 px-5 py-3.5 backdrop-blur-md"
            style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              id="checkout-pay-btn"
              className="ob-flow-btn-primary w-full touch-manipulation disabled:opacity-50"
              disabled={!checkoutReady}
              onClick={() => void startCheckoutPayment()}
            >
              {checkoutReady ? "결제하기" : "결제 준비 중…"}
            </button>
          </div>
      </div>

      <CheckoutMemberWelcomeSheet active={checkoutReady && referralReady} />

      <div
        id="loading-screen"
        className="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      >
        <div className="flex w-full max-w-sm flex-col items-center rounded-2xl bg-white p-8 text-center shadow-2xl">
          <PingLoadingSpinner size="lg" label="처리 중" className="mb-4" />
          <h3 className="mb-2 text-xl font-bold text-gray-800" id="loading-title">
            처리 중
          </h3>
          <p className="text-sm text-gray-500" id="loading-desc">
            잠시만 기다려 주세요…
          </p>
        </div>
      </div>
    </>
  );
}
