import {
  markCheckoutPaymentMethod,
  PING_BANK_TRANSFER,
  saveBankTransferConfirmSession,
} from "@/lib/ping-bank-transfer-checkout";
import { getOrCreateVisitorId } from "@/lib/ping-referral-client";
import {
  normalizeCashReceiptNumber,
  resolveCashReceiptNumber,
  validateCashReceiptNumber,
  type PingCashReceiptType,
} from "@/lib/ping-cash-receipt";
const PING_CHECKOUT_STORAGE = "ping_checkout_session";

// —— Portone probe (legacy checkout.html <head>) ——
export function installCheckoutPortoneProbe(): void {
  if (typeof window === "undefined") return;
  const p: PingCheckoutPortoneProbe = {
    done: false,
    ok: false,
    status: null,
    emptyPayload: false,
  };
  window.__PING_CHECKOUT_PORTONE_PROBE__ = p;
  window.__PING_AWAIT_CHECKOUT_PORTONE_PROBE__ = (ms = 8000) => {
    const t0 = Date.now();
    return new Promise<void>((resolve) => {
      const w = () => {
        if (p.done || Date.now() - t0 >= ms) resolve();
        else setTimeout(w, 25);
      };
      w();
    });
  };
  function refreshBanner() {
    const el = document.getElementById("checkout-portone-api-banner");
    if (!el || !p.done) return;
    let show = false;
    let msg = "";
    if (window.__PING_PORTONE_CONFIG_SCRIPT_ERROR__) {
      show = true;
      msg =
        "/api/portone-config.js 스크립트를 실행하지 못했습니다. npm run dev(기본 3000)로 checkout을 열었는지, Firebase Hosting만 쓰는 경우 API 리라이트·PING_BACKEND_API_ORIGIN(assets/js/ping-backend-api-path.js)을 확인하세요.";
    } else if (!p.ok) {
      show = true;
      if (p.status === 404) {
        msg =
          "/api/portone-config.js 가 없습니다(404). 로컬은 npm run dev, 배포는 Express/Functions와 Hosting 리라이트를 확인하세요.";
      } else if (p.status === 0) {
        msg = "결제 설정을 네트워크 오류로 불러오지 못했습니다.";
      } else {
        msg = "결제 설정 응답 오류(HTTP " + String(p.status) + ").";
      }
    } else if (p.emptyPayload) {
      show = true;
      msg =
        "서버는 /api/portone-config.js 를 주지만 토스 결제위젯 키(test_gck_…)가 비었습니다. 루트 .env 의 TOSS_PAYMENTS_WIDGET_CLIENT_KEY 또는 PING_USE_TOSS_DOCS_TEST_KEYS 를 확인하세요.";
    }
    el.textContent = msg;
    el.hidden = !show;
  }
  window.__PING_CHECKOUT_PORTONE_REFRESH_BANNER__ = refreshBanner;
  window.__PING_PORTONE_CONFIG__ = window.__PING_PORTONE_CONFIG__ || {};
  fetch("/api/portone-config.js", { cache: "no-store", credentials: "same-origin" })
    .then((r) => {
      p.status = r.status;
      p.ok = r.ok;
      if (!r.ok) {
        p.done = true;
        refreshBanner();
        return;
      }
      return r.text().then(() => {
        try {
          const cfg = window.__PING_PORTONE_CONFIG__ || {};
          const tk = String(cfg.tossPaymentsClientKey || "").trim();
          const mock = Boolean(cfg.tossConfirmMock);
          const docs = Boolean(cfg.tossUseDocsTestKeys);
          p.emptyPayload = !tk && !mock && !docs;
        } catch {
          p.emptyPayload = true;
        }
        p.done = true;
        refreshBanner();
      });
    })
    .catch(() => {
      p.status = 0;
      p.ok = false;
      p.done = true;
      refreshBanner();
    });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshBanner);
  } else {
    refreshBanner();
  }
}

type CheckoutCtx = {
  orderId: string;
  amount: number;
  orderName: string;
  customerName: string;
  customerMobilePhone: string;
  customerEmail: string;
  recipientCount: number | null;
  sendChannelLabel: string;
};

let ctx: CheckoutCtx | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let widgets: any = null;
let __pingTossAgreementOk = false;
let __pingTossAgreementEventSeen = false;
let orderTotal = 0;
let pointsToUse = 0;
let balanceEngage = 0;
let balanceReferral = 0;
let balanceTotal = 0;
let pointsOnlyMode = false;
let paymentMethod: "card" | "bank" = "bank";
let deviceId = "";
let referralCode = "";
let tossReturnInFlight = false;
let paymentMethodUiWired = false;
let tossWidgetsMounted = false;
let tossAgreementWidgetWired = false;
let cardWidgetMountInFlight = false;

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function getTossWidgetClientKey(): string {
  return String(window.__PING_PORTONE_CONFIG__?.tossPaymentsClientKey || "").trim();
}

function createTossWidgetsInstance(): boolean {
  const TossPayments = window.TossPayments;
  const key = getTossWidgetClientKey();
  if (typeof TossPayments === "undefined" || !key) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tossPayments = (TossPayments as any)(key);
    const anon =
      typeof TossPayments !== "undefined" && TossPayments.ANONYMOUS !== undefined
        ? TossPayments.ANONYMOUS
        : "ANONYMOUS";
    widgets = tossPayments.widgets({ customerKey: anon });
    tossWidgetsMounted = false;
    tossAgreementWidgetWired = false;
    return true;
  } catch (e) {
    console.error("createTossWidgetsInstance", e);
    widgets = null;
    return false;
  }
}

function pingIsTossWidgetV2ClientKey(key: string) {
  return String(key || "").includes("_gck_");
}

function pingUsesCheckoutSessionApi(path: string): boolean {
  return (
    path.startsWith("/api/checkout/") ||
    path.startsWith("/api/toss/") ||
    path.startsWith("/api/payment/")
  );
}

function pingBackendOnlyApiPath(path: string) {
  const p = String(path || "").charAt(0) === "/" ? String(path) : "/" + String(path);
  const h = window.location.hostname;
  const loopback = h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  const port = String(window.location.port || "");
  try {
    const pc = window.__PING_PORTONE_CONFIG__ || {};
    /** register-session·bank-transfer 등 checkout 세션은 UI와 동일 출처(Next route)에 있어야 함 */
    if (pingUsesCheckoutSessionApi(p)) {
      return p;
    }
    if (p.indexOf("/api/auth/") === 0) {
      const ndp = pc.pingNextDevPort;
      const nextPort = ndp != null && String(ndp) !== "" ? String(ndp) : "3002";
      const onNextDev = port !== "" && port === nextPort;
      if (loopback || onNextDev) {
        return p;
      }
      const boAuth = String(pc.backendApiOrigin || "")
        .trim()
        .replace(/\/+$/, "");
      if (boAuth) return boAuth + p;
      return p;
    }
    const bo = String(pc.backendApiOrigin || "")
      .trim()
      .replace(/\/+$/, "");
    if (bo) return bo + p;
  } catch {
    /* ignore */
  }
  if (loopback) {
    return "http://localhost:3000" + p;
  }
  return p;
}

function getTossConfirmPaymentApiUrl() {
  return pingBackendOnlyApiPath("/api/toss/confirm-payment");
}
function getPointsOnlyPaymentApiUrl() {
  return pingBackendOnlyApiPath("/api/payment/points-only");
}
function getBankTransferApiUrl() {
  return pingBackendOnlyApiPath("/api/checkout/bank-transfer");
}

async function ensureCheckoutSessionRegistered(orderId: string, totalAmount: number) {
  const res = await fetch("/api/checkout/register-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, totalAmount }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(String(json.error || "결제 준비에 실패했습니다."));
  }
}

function showLoading(title: string, desc: string) {
  const t = document.getElementById("loading-title");
  const d = document.getElementById("loading-desc");
  if (t) t.textContent = title || "처리 중";
  if (d) d.textContent = desc || "";
  document.getElementById("loading-screen")?.classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loading-screen")?.classList.add("hidden");
}

function pingAgreementStatusToOk(st: unknown): boolean {
  if (!st || typeof st !== "object") return false;
  const o = st as Record<string, unknown>;
  if (o.agreedRequiredTerms === true) return true;
  if (o.agreed_required_terms === true) return true;
  if (o.isAgreed === true) return true;
  const nested = o.agreementStatus || o.agreement;
  if (nested && typeof nested === "object") {
    const n = nested as Record<string, unknown>;
    if (n.agreedRequiredTerms === true) return true;
  }
  return false;
}

function indexUrlWithParams(params: Record<string, string | number | null | undefined>) {
  const u = new URL("/start", window.location.origin);
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v != null && v !== "") u.searchParams.set(k, String(v));
  });
  return u.pathname + (u.search ? u.search : "");
}

function redirectPaymentSuccessPage(
  orderId: string,
  amount: number,
  recipientCount: number | null | undefined,
  sendChannelLabel: string,
  bankTransfer?: boolean,
) {
  const u = new URL("/payment-success", window.location.origin);
  u.searchParams.set("orderId", String(orderId));
  u.searchParams.set("amount", String(amount));
  if (bankTransfer) u.searchParams.set("bank_transfer", "1");
  if (
    recipientCount != null &&
    recipientCount !== ("" as unknown as number) &&
    isFinite(Number(recipientCount)) &&
    Number(recipientCount) >= 0
  ) {
    u.searchParams.set("count", String(Math.floor(Number(recipientCount))));
  }
  if (sendChannelLabel) u.searchParams.set("channel", String(sendChannelLabel));
  window.location.replace(u.pathname + u.search);
}

function redirectIndexPayFail(orderId: string, msg: string) {
  window.location.replace(
    indexUrlWithParams({
      ping_pay_fail: "1",
      orderId: orderId || "",
      msg: msg || "결제에 실패했습니다.",
    }),
  );
}

type CashReceiptChoice = PingCashReceiptType | "voluntary";

function getCashReceiptChoice(): CashReceiptChoice | null {
  const choiceEl = document.querySelector(
    'input[name="checkout-cash-receipt-choice"]:checked',
  ) as HTMLInputElement | null;
  const choice = choiceEl?.value;
  if (
    choice === "income_deduction" ||
    choice === "expense_proof" ||
    choice === "voluntary"
  ) {
    return choice;
  }
  return null;
}

function readBankCashReceiptSelection(): {
  type: PingCashReceiptType;
  number: string;
  voluntary: boolean;
} | null {
  const numEl = document.getElementById("checkout-cash-receipt-number") as HTMLInputElement | null;
  const choice = getCashReceiptChoice();
  if (!choice) return null;
  if (choice === "voluntary") {
    return { type: "income_deduction", number: "", voluntary: true };
  }
  const number = numEl?.value?.trim() || "";
  if (!number) return null;
  return { type: choice, number, voluntary: false };
}

function syncCashReceiptNumberPlaceholder() {
  const wrapEl = document.getElementById("checkout-cash-receipt-number-wrap");
  const numEl = document.getElementById("checkout-cash-receipt-number") as HTMLInputElement | null;
  if (!numEl) return;
  const choice = getCashReceiptChoice();
  if (choice === "voluntary") {
    wrapEl?.classList.add("hidden");
    numEl.value = "";
    numEl.removeAttribute("disabled");
    return;
  }
  wrapEl?.classList.remove("hidden");
  if (numEl.value && /^\d{3}-\d{3,4}-\d{4}$/.test(numEl.value)) {
    numEl.value = "";
  }
  if (numEl.value === "0000000000") numEl.value = "";
  if (choice === "expense_proof") {
    numEl.placeholder = "사업자등록번호 10자리 (예: 1234567890)";
  } else {
    numEl.placeholder = "휴대폰 번호 (예: 01012345678)";
  }
}

async function finalizeCheckoutSuccess(
  orderId: string,
  _json: Record<string, unknown>,
  redirectAmount: number,
  _paymentKeyFallback: string,
) {
  let recipientCountRedirect: number | null = null;
  let sendChannelLabelRedirect = "";
  try {
    const rawSess = sessionStorage.getItem(PING_CHECKOUT_STORAGE);
    if (rawSess) {
      const so = JSON.parse(rawSess) as {
        recipientCount?: number;
        sendChannelLabel?: string;
      };
      if (so && so.recipientCount != null && isFinite(Number(so.recipientCount))) {
        recipientCountRedirect = Math.max(0, Math.floor(Number(so.recipientCount)));
      }
      if (so && so.sendChannelLabel) {
        sendChannelLabelRedirect = String(so.sendChannelLabel).trim();
      }
    }
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem("ping_toss_pending");
    sessionStorage.removeItem(PING_CHECKOUT_STORAGE);
  } catch {
    /* ignore */
  }
  hideLoading();
  markCheckoutPaymentMethod("card");
  redirectPaymentSuccessPage(orderId, redirectAmount, recipientCountRedirect, sendChannelLabelRedirect);
}

async function finalizeBankTransferSuccess(orderId: string, _json: Record<string, unknown>, redirectAmount: number) {
  let recipientCountRedirect: number | null = null;
  let sendChannelLabelRedirect = "";
  try {
    const rawSess = sessionStorage.getItem(PING_CHECKOUT_STORAGE);
    if (rawSess) {
      const so = JSON.parse(rawSess) as {
        recipientCount?: number;
        sendChannelLabel?: string;
      };
      if (so && so.recipientCount != null && isFinite(Number(so.recipientCount))) {
        recipientCountRedirect = Math.max(0, Math.floor(Number(so.recipientCount)));
      }
      if (so && so.sendChannelLabel) {
        sendChannelLabelRedirect = String(so.sendChannelLabel).trim();
      }
    }
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem("ping_toss_pending");
    sessionStorage.removeItem(PING_CHECKOUT_STORAGE);
  } catch {
    /* ignore */
  }
  saveBankTransferConfirmSession(orderId, redirectAmount);
  hideLoading();
  redirectPaymentSuccessPage(
    orderId,
    redirectAmount,
    recipientCountRedirect,
    sendChannelLabelRedirect,
    true,
  );
}

function wireTossAgreementWidget(ag: { on: (ev: string, fn: (st: unknown) => void) => void }) {
  if (tossAgreementWidgetWired) return;
  tossAgreementWidgetWired = true;
  __pingTossAgreementEventSeen = false;
  ag.on("agreementStatusChange", function (st: unknown) {
    __pingTossAgreementEventSeen = true;
    __pingTossAgreementOk = pingAgreementStatusToOk(st);
    syncPayButton();
  });
  setTimeout(function () {
    if (__pingTossAgreementEventSeen) return;
    __pingTossAgreementOk = true;
    syncPayButton();
  }, 0);
}

/** 토스 결제위젯은 보이는 컨테이너에 마운트해야 iframe이 표시됩니다. */
async function mountTossPaymentWidgets(): Promise<boolean> {
  if (pointsOnlyMode) return false;
  if (!widgets && !createTossWidgetsInstance()) return false;

  const methods = document.getElementById("ping-payment-methods");
  const agreement = document.getElementById("ping-payment-agreement");
  if (!methods || !agreement) return false;

  methods.classList.remove("hidden");
  agreement.classList.remove("hidden");
  await waitForNextFrame();

  const card = getCardAmount();
  if (card <= 0) {
    methods.replaceChildren();
    agreement.replaceChildren();
    const msg = document.createElement("p");
    msg.className = "m-0 p-2 text-sm leading-relaxed text-gray-600";
    msg.textContent =
      "포인트로 결제 금액을 모두 사용 중입니다. 카드·간편결제를 쓰려면 포인트 사용액을 줄여 주세요.";
    methods.appendChild(msg);
    tossWidgetsMounted = true;
    return true;
  }

  try {
    methods.replaceChildren();
    agreement.replaceChildren();
    tossAgreementWidgetWired = false;

    await widgets.setAmount({ currency: "KRW", value: card });
    const pair = await Promise.all([
      widgets.renderPaymentMethods({ selector: "#ping-payment-methods", variantKey: "DEFAULT" }),
      widgets.renderAgreement({ selector: "#ping-payment-agreement", variantKey: "AGREEMENT" }),
    ]);
    wireTossAgreementWidget(pair[1] as { on: (ev: string, fn: (st: unknown) => void) => void });
    tossWidgetsMounted = true;
    return true;
  } catch (e) {
    console.error("mountTossPaymentWidgets", e);
    return false;
  }
}

/** 탭 UI와 내부 state 불일치 방지 (React 재마운트·Strict Mode 대비) */
function getActivePaymentMethodFromDom(): "card" | "bank" {
  const active = document.querySelector(
    "[data-checkout-pay-method].is-active",
  ) as HTMLButtonElement | null;
  const m = active?.getAttribute("data-checkout-pay-method");
  if (m === "bank" || m === "card") {
    paymentMethod = m;
    return m;
  }
  return paymentMethod;
}

function applyPaymentMethodUi(method: "card" | "bank") {
  paymentMethod = method;
  const bankPanel = document.getElementById("checkout-bank-transfer-panel");
  const methods = document.getElementById("ping-payment-methods");
  const agreement = document.getElementById("ping-payment-agreement");
  document.querySelectorAll("[data-checkout-pay-method]").forEach((el) => {
    const btn = el as HTMLButtonElement;
    const m = btn.getAttribute("data-checkout-pay-method");
    const active = m === method;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (method === "bank") {
    bankPanel?.classList.remove("hidden");
    methods?.classList.add("hidden");
    agreement?.classList.add("hidden");
    document.body.classList.remove("ping-ui-widget-phase");
  } else {
    bankPanel?.classList.add("hidden");
    methods?.classList.remove("hidden");
    agreement?.classList.remove("hidden");
    document.body.classList.add("ping-ui-widget-phase");
  }
}

async function showCardPaymentTab() {
  applyPaymentMethodUi("card");
  if (!widgets && !createTossWidgetsInstance()) {
    alert(
      "카드·간편결제를 불러오지 못했습니다. 토스 결제위젯 키와 SDK 로드를 확인한 뒤 페이지를 새로고침해 주세요.",
    );
    syncPayButton();
    return;
  }
  if (cardWidgetMountInFlight) return;
  cardWidgetMountInFlight = true;
  const methods = document.getElementById("ping-payment-methods");
  if (methods) {
    methods.replaceChildren();
    const loading = document.createElement("div");
    loading.className = "flex justify-center py-6";
    const spin = document.createElement("div");
    spin.className = "loader";
    spin.style.width = "32px";
    spin.style.height = "32px";
    spin.setAttribute("aria-hidden", "true");
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = "결제 수단을 불러오는 중";
    loading.appendChild(spin);
    loading.appendChild(sr);
    methods.appendChild(loading);
  }
  try {
    createTossWidgetsInstance();
    const ok = await mountTossPaymentWidgets();
    if (!ok) {
      alert(
        "카드·간편결제 화면을 불러오지 못했습니다. 잠시 후 다시 시도하거나 무통장 입금을 이용해 주세요.",
      );
    }
  } finally {
    cardWidgetMountInFlight = false;
    syncPayButton();
  }
}

function setPaymentMethod(method: "card" | "bank") {
  if (method === "card") {
    void showCardPaymentTab();
    return;
  }
  applyPaymentMethodUi("bank");
  syncPayButton();
}

function wirePaymentMethodUI() {
  if (!paymentMethodUiWired) {
    paymentMethodUiWired = true;
    document.querySelectorAll("[data-checkout-pay-method]").forEach((el) => {
      const btn = el as HTMLButtonElement;
      btn.onclick = function () {
        const m = btn.getAttribute("data-checkout-pay-method");
        if (m === "bank" || m === "card") {
          setPaymentMethod(m);
        }
      };
    });
    const bankAg = document.getElementById("checkout-bank-agree");
    if (bankAg) {
      bankAg.addEventListener("change", function () {
        syncPayButton();
      });
    }
    document.querySelectorAll('input[name="checkout-cash-receipt-choice"]').forEach((el) => {
      el.addEventListener("change", syncCashReceiptNumberPlaceholder);
    });
    syncCashReceiptNumberPlaceholder();
  }
  setPaymentMethod(paymentMethod);
}

function enableBankOnlyCheckout() {
  const cardTab = document.querySelector('[data-checkout-pay-method="card"]');
  cardTab?.classList.add("hidden");
  paymentMethod = "bank";
  document.getElementById("ping-ui-widget-wrap")?.classList.remove("hidden");
  wirePaymentMethodUI();
  updatePointsDisplays(true);
  syncPayButton();
}

async function handleTossPaymentReturn(paymentKey: string, orderId: string, amount: string) {
  if (tossReturnInFlight) return;
  tossReturnInFlight = true;
  showLoading("결제 승인 중", "토스페이먼츠에 승인을 요청하고 있습니다…");
  try {
    let pending: {
      orderId?: string;
      amount?: number;
      pointsUsed?: number;
      orderTotal?: number;
      deviceId?: string;
      referralCode?: string;
    } | null = null;
    try {
      pending = JSON.parse(sessionStorage.getItem("ping_toss_pending") || "null");
    } catch {
      /* ignore */
    }
    if (pending && pending.orderId === orderId) {
      if (Number(pending.amount) !== Number(amount)) {
        throw new Error("결제 금액이 주문과 일치하지 않습니다.");
      }
    }
    const pu =
      pending && pending.pointsUsed != null ? Math.max(0, Math.floor(Number(pending.pointsUsed))) : 0;
    const ot = pending && pending.orderTotal != null ? Math.floor(Number(pending.orderTotal)) : null;
    const did = pending && pending.deviceId ? String(pending.deviceId) : "";
    const rcode = pending && pending.referralCode != null ? String(pending.referralCode) : "";
    const res = await fetch(getTossConfirmPaymentApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentKey: paymentKey,
        orderId: orderId,
        amount: Number(amount),
        orderTotal: ot != null && isFinite(ot) ? ot : Number(amount) + pu,
        pointsUsed: pu,
        deviceId: did,
        referralCode: rcode,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        String(json.error || json.message || "결제 승인에 실패했습니다."),
      );
    }
    const pay = json.payment as { totalAmount?: number } | undefined;
    const cardPaid = Number(pay && pay.totalAmount != null ? pay.totalAmount : amount);
    const receiptTotal =
      pending && pending.orderTotal != null && isFinite(Number(pending.orderTotal))
        ? Number(pending.orderTotal)
        : cardPaid + pu;
    await finalizeCheckoutSuccess(orderId, json, receiptTotal, paymentKey);
  } catch (err) {
    console.error(err);
    hideLoading();
    tossReturnInFlight = false;
    redirectIndexPayFail(orderId, err instanceof Error ? err.message : "결제 승인에 실패했습니다.");
  }
}

function getCardAmount() {
  return Math.max(0, orderTotal - pointsToUse);
}

function maxUsablePoints() {
  return Math.min(balanceTotal, orderTotal);
}

function getPointsInputEl() {
  return document.getElementById("checkout-points-input") as HTMLInputElement | null;
}

function readPointsFromInput() {
  const inp = getPointsInputEl();
  if (!inp || inp.disabled) return pointsToUse;
  const mu = maxUsablePoints();
  let raw = parseInt(String(inp.value).trim(), 10);
  if (isNaN(raw) || raw < 0) raw = 0;
  return Math.min(raw, mu);
}

function persistPendingToSession() {
  if (!ctx) return;
  try {
    sessionStorage.setItem(
      "ping_toss_pending",
      JSON.stringify({
        orderId: ctx.orderId,
        amount: getCardAmount(),
        orderTotal: orderTotal,
        pointsUsed: pointsToUse,
        deviceId: deviceId,
        referralCode: referralCode,
      }),
    );
  } catch {
    /* ignore */
  }
}

async function initPointIds() {
  try {
    const PR = window.PingReferral;
    if (PR && typeof PR.getDeviceId === "function") {
      deviceId = String(PR.getDeviceId() || "");
    }
    if (PR && typeof PR.registerMyCode === "function") {
      referralCode = String((await PR.registerMyCode()) || "");
    }
  } catch (eId) {
    console.warn("포인트 식별자", eId);
  }
}

async function loadPointBalances() {
  await initPointIds();
  balanceEngage = 0;
  balanceReferral = 0;
  try {
    if (deviceId) {
      const r1 = await fetch("/api/reward/summary?deviceId=" + encodeURIComponent(deviceId));
      const s1 = (await r1.json().catch(() => ({}))) as { ok?: boolean; engagePoints?: number };
      if (s1 && s1.ok) balanceEngage = Math.max(0, Math.floor(Number(s1.engagePoints) || 0));
    }
  } catch {
    /* ignore */
  }
  try {
    if (referralCode && referralCode.length >= 4) {
      const r2 = await fetch("/api/referral/balance?code=" + encodeURIComponent(referralCode));
      const s2 = (await r2.json().catch(() => ({}))) as { ok?: boolean; points?: number };
      if (s2 && s2.ok) balanceReferral = Math.max(0, Math.floor(Number(s2.points) || 0));
    }
  } catch {
    /* ignore */
  }
  balanceTotal = balanceEngage + balanceReferral;
  const balEl = document.getElementById("checkout-pt-balance");
  if (balEl) balEl.textContent = balanceTotal.toLocaleString("ko-KR");
  const inp = getPointsInputEl();
  if (inp && !inp.disabled) {
    const mu = maxUsablePoints();
    inp.setAttribute("max", String(Math.max(0, mu)));
    const v = Math.min(Math.max(0, pointsToUse), mu);
    pointsToUse = v;
    inp.value = String(v);
  }
}

function updatePointsDisplays(skipSetAmount: boolean) {
  const inp = getPointsInputEl();
  if (inp) {
    if (!inp.disabled) {
      pointsToUse = readPointsFromInput();
      inp.value = String(pointsToUse);
    }
  }
  const card = getCardAmount();
  const dedEl = document.getElementById("checkout-points-deduct-line");
  if (dedEl) {
    dedEl.textContent = pointsToUse > 0 ? "−" + pointsToUse.toLocaleString("ko-KR") + "P" : "0P";
  }
  const ca = document.getElementById("checkout-card-amount-line");
  if (ca) ca.textContent = card.toLocaleString("ko-KR") + "원";

  const wrap = document.getElementById("ping-ui-widget-wrap");
  const agreeWrap = document.getElementById("checkout-points-only-agree-wrap");
  if (orderTotal > 0 && card === 0) {
    pointsOnlyMode = true;
    wrap?.classList.add("hidden");
    agreeWrap?.classList.remove("hidden");
  } else {
    pointsOnlyMode = false;
    wrap?.classList.remove("hidden");
    agreeWrap?.classList.add("hidden");
    const chk = document.getElementById("checkout-points-only-agree") as HTMLInputElement | null;
    if (chk) chk.checked = false;
    if (!skipSetAmount && widgets && card > 0 && paymentMethod === "card") {
      void widgets.setAmount({ currency: "KRW", value: card }).catch((e: unknown) => {
        console.warn("setAmount", e);
      });
    }
  }
  syncPayButton();
  persistPendingToSession();
}

function syncpayAgreementOkForButton() {
  if (pointsOnlyMode) {
    const chk = document.getElementById("checkout-points-only-agree") as HTMLInputElement | null;
    return !!(chk && chk.checked);
  }
  if (getActivePaymentMethodFromDom() === "bank") {
    const chk = document.getElementById("checkout-bank-agree") as HTMLInputElement | null;
    return !!(chk && chk.checked);
  }
  return __pingTossAgreementOk;
}

function wireCheckoutPayButton() {
  syncPayButton();
}

/** React checkout-client 하단 CTA — 재렌더 후에도 클릭 유지 */
export function startCheckoutPayment() {
  return startPayment();
}

export function syncCheckoutPayButton() {
  syncPayButton();
}

function fallbackPointsOnlyWithoutCardWidget(warnText: string) {
  const errEl = document.getElementById("checkout-error");
  if (errEl) {
    errEl.className =
      "rounded-xl bg-amber-50 text-amber-900 text-sm p-4 mb-4 border border-amber-100 leading-relaxed";
    errEl.textContent = warnText || "";
    errEl.classList.remove("hidden");
  }
  pointsToUse = orderTotal;
  const ptInp = getPointsInputEl();
  if (ptInp) {
    ptInp.value = String(orderTotal);
    ptInp.disabled = false;
  }
  const wwrap = document.getElementById("ping-ui-widget-wrap");
  wwrap?.classList.add("hidden");
  updatePointsDisplays(true);
  syncPayButton();
  wireCheckoutPayButton();
}

function syncPayButton() {
  const btn = document.getElementById("checkout-pay-btn");
  if (!btn || !ctx) return;
  const method = getActivePaymentMethodFromDom();
  const ok = syncpayAgreementOkForButton();
  (btn as HTMLButtonElement).disabled = !ok;
  const card = getCardAmount();
  if (pointsOnlyMode) {
    btn.textContent = orderTotal.toLocaleString("ko-KR") + "원 포인트 결제하기";
  } else if (method === "bank") {
    btn.textContent = card.toLocaleString("ko-KR") + "원 · 입금 안내 받기";
  } else {
    btn.textContent = card.toLocaleString("ko-KR") + "원 결제하기";
  }
}

async function startPayment() {
  if (!ctx) {
    alert("결제 화면을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    return;
  }
  orderTotal = Math.max(0, Math.floor(Number(orderTotal)));
  const payInp = getPointsInputEl();
  if (payInp && !payInp.disabled) {
    pointsToUse = readPointsFromInput();
  }
  pointsToUse = Math.max(0, Math.floor(Number(pointsToUse)));
  const mu = maxUsablePoints();
  pointsToUse = Math.min(pointsToUse, mu, orderTotal);
  if (payInp && !payInp.disabled) {
    payInp.value = String(pointsToUse);
  }
  const cardAmt = Math.max(0, orderTotal - pointsToUse);
  if (pointsToUse > balanceTotal) {
    alert("사용 가능한 포인트를 초과했습니다.");
    return;
  }
  if (pointsToUse + cardAmt !== orderTotal) {
    alert("결제 금액 구성이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해 주세요.");
    return;
  }
  const activePayMethod = getActivePaymentMethodFromDom();
  if (!syncpayAgreementOkForButton()) {
    alert(
      activePayMethod === "bank"
        ? "무통장 입금 예정 및 약관 동의에 체크해 주세요."
        : pointsOnlyMode
          ? "필수 동의에 체크해 주세요."
          : "필수 약관에 동의해 주세요.",
    );
    return;
  }
  persistPendingToSession();
  if (orderTotal > 0 && cardAmt === 0) {
    showLoading("결제 처리 중", "포인트를 사용합니다…");
    try {
      if (
        !deviceId &&
        window.PingReferral &&
        typeof window.PingReferral.getDeviceId === "function"
      ) {
        deviceId = String(window.PingReferral.getDeviceId() || "");
      }
      if (!deviceId) {
        throw new Error("포인트 사용을 위해 식별 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      }
      if (pointsToUse !== orderTotal) {
        throw new Error("포인트 사용액이 주문 금액과 맞지 않습니다. 사용 포인트를 확인해 주세요.");
      }
      const res = await fetch(getPointsOnlyPaymentApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: ctx.orderId,
          orderTotal: orderTotal,
          pointsUsed: pointsToUse,
          deviceId: deviceId,
          referralCode: referralCode,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(
          String(json.error || json.message || "포인트 결제에 실패했습니다."),
        );
      }
      await finalizeCheckoutSuccess(ctx.orderId, json, orderTotal, "points_only");
    } catch (e) {
      console.error(e);
      hideLoading();
      alert(e instanceof Error ? e.message : "포인트 결제에 실패했습니다.");
    }
    return;
  }
  if (activePayMethod === "bank") {
    if (cardAmt <= 0) {
      alert("무통장 입금 금액이 없습니다. 포인트 사용액을 줄이거나 전액 포인트 결제를 이용해 주세요.");
      return;
    }
    const crChoice = getCashReceiptChoice();
    if (!crChoice) {
      alert("현금영수증 유형을 선택해 주세요.");
      return;
    }
    let crSel = readBankCashReceiptSelection();
    if (!crSel) {
      if (crChoice === "voluntary") {
        crSel = { type: "income_deduction", number: "", voluntary: true };
      } else {
        alert("현금영수증 번호를 입력해 주세요.");
        return;
      }
    }
    const crErr = validateCashReceiptNumber(crSel.type, crSel.number, crSel.voluntary);
    if (crErr) {
      alert(crErr);
      return;
    }
    const crNorm = resolveCashReceiptNumber(crSel.type, crSel.number, crSel.voluntary);
    showLoading("처리 중", "입금 안내를 준비하고 있습니다…");
    try {
      if (
        !deviceId &&
        window.PingReferral &&
        typeof window.PingReferral.getDeviceId === "function"
      ) {
        deviceId = String(window.PingReferral.getDeviceId() || "");
      }
      if (!deviceId) {
        deviceId = getOrCreateVisitorId();
      }
      if (pointsToUse > 0 && !deviceId) {
        throw new Error(
          "포인트와 무통장 입금을 함께 쓰려면 식별 정보가 필요합니다. 새로고침 후 다시 시도해 주세요.",
        );
      }
      const res = await fetch(getBankTransferApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: ctx.orderId,
          orderTotal: orderTotal,
          pointsUsed: pointsToUse,
          bankTransferAmount: cardAmt,
          deviceId: deviceId,
          referralCode: referralCode,
          cashReceiptType: crSel.type,
          cashReceiptNumber: crNorm,
          cashReceiptVoluntary: crSel.voluntary,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(
          String(json.error || json.message || "입금 안내 받기에 실패했습니다."),
        );
      }
      await finalizeBankTransferSuccess(
        ctx.orderId,
        {
          ...json,
          cashReceiptType: crSel.type,
          cashReceiptNumber: crNorm,
          cashReceiptVoluntary: crSel.voluntary,
        },
        orderTotal,
      );
    } catch (e) {
      console.error(e);
      hideLoading();
      alert(e instanceof Error ? e.message : "입금 안내 받기에 실패했습니다.");
    }
    return;
  }
  if (!widgets) {
    alert(
      "카드·간편결제를 사용하려면 결제 화면을 새로고침하거나, 무통장 입금·전액 포인트 결제를 이용해 주세요.",
    );
    return;
  }
  const base = window.location.origin + window.location.pathname;
  try {
    await widgets.requestPayment({
      orderId: ctx.orderId,
      orderName: ctx.orderName,
      successUrl: base + "?ping_toss_return=success",
      failUrl: base + "?ping_toss_return=fail",
      customerEmail: ctx.customerEmail,
      customerName: ctx.customerName,
      customerMobilePhone: ctx.customerMobilePhone,
    });
  } catch (e) {
    console.error(e);
    alert(e instanceof Error ? e.message : "결제 요청에 실패했습니다.");
  }
}

export function destroyCheckoutPage(): void {
  document.body.classList.remove("ping-ui-widget-phase");
  document.getElementById("ping-payment-methods")?.replaceChildren();
  document.getElementById("ping-payment-agreement")?.replaceChildren();
  widgets = null;
  ctx = null;
  paymentMethod = "bank";
  paymentMethodUiWired = false;
  tossWidgetsMounted = false;
  tossAgreementWidgetWired = false;
  cardWidgetMountInFlight = false;
  __pingTossAgreementOk = false;
  __pingTossAgreementEventSeen = false;
  tossReturnInFlight = false;
}

export async function initCheckoutPage(): Promise<void> {
  installCheckoutPortoneProbe();

  const urlParams = new URLSearchParams(window.location.search);
  const tossRet = urlParams.get("ping_toss_return");
  if (tossRet === "success") {
    const tKey = urlParams.get("paymentKey");
    const tOrder = urlParams.get("orderId");
    const tAmt = urlParams.get("amount");
    if (tKey && tOrder && tAmt) {
      void handleTossPaymentReturn(tKey, tOrder, tAmt);
      return;
    }
  }
  if (tossRet === "fail") {
    const message = urlParams.get("message") || "결제가 취소되었습니다.";
    const failOid = urlParams.get("orderId") || "";
    redirectIndexPayFail(failOid, decodeURIComponent(message));
    return;
  }

  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PING_CHECKOUT_STORAGE);
  } catch {
    /* ignore */
  }
  if (!raw) {
    alert("결제 정보가 없습니다. 신청 화면에서 다시 진행해 주세요.");
    window.location.href = "/";
    return;
  }
  let sess: Record<string, unknown>;
  try {
    sess = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    alert("결제 정보가 올바르지 않습니다.");
    window.location.href = "/";
    return;
  }
  if (!sess.orderId || sess.amount == null) {
    alert("결제 정보가 올바르지 않습니다.");
    window.location.href = "/";
    return;
  }

  ctx = {
    orderId: String(sess.orderId).trim(),
    amount: Number(sess.amount),
    orderName: String(sess.orderName || "PING 부고 발송").trim(),
    customerName: String(sess.customerName || "").trim(),
    customerMobilePhone: String(sess.customerMobilePhone || "").trim(),
    customerEmail:
      String(sess.customerEmail || "").trim() ||
      String(sess.customerMobilePhone || "").replace(/\D/g, "") + "@ping.temp",
    recipientCount: sess.recipientCount != null ? Number(sess.recipientCount) : null,
    sendChannelLabel: String(sess.sendChannelLabel || "").trim(),
  };
  orderTotal = Math.max(0, Math.floor(Number(ctx.amount)));
  pointsToUse = 0;

  try {
    await ensureCheckoutSessionRegistered(ctx.orderId, orderTotal);
  } catch (regErr) {
    console.warn("[checkout] register-session on init", regErr);
  }

  const orderIdEl = document.getElementById("checkout-order-id");
  if (orderIdEl) orderIdEl.textContent = ctx.orderId;
  const nameEl = document.getElementById("checkout-order-name");
  if (nameEl) nameEl.textContent = ctx.orderName;
  const chEl = document.getElementById("checkout-send-channel");
  if (chEl) {
    chEl.textContent =
      ctx.sendChannelLabel ||
      (String(sess.preferredSendChannel || "") === "sms" ? "문자(LMS)" : "카카오 알림톡");
  }
  const fromEl = document.getElementById("checkout-send-from");
  if (fromEl) {
    void fetch("/api/ping-config-send-from", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok?: boolean; label?: string }) => {
        if (j.ok && j.label) fromEl.textContent = String(j.label);
        else fromEl.textContent = "PING 대표번호";
      })
      .catch(() => {
        fromEl.textContent = "PING 대표번호";
      });
  }
  const amtEl = document.getElementById("checkout-amount");
  if (amtEl) amtEl.textContent = orderTotal.toLocaleString("ko-KR") + "원";

  const _pingPortoneCfg = window.__PING_PORTONE_CONFIG__ || {};
  const TOSS_WIDGET_CLIENT_KEY = String(_pingPortoneCfg.tossPaymentsClientKey || "").trim();

  const ptInp = getPointsInputEl();
  if (ptInp) {
    for (const ev of ["input", "change", "blur"] as const) {
      ptInp.addEventListener(ev, function () {
        updatePointsDisplays(false);
      });
    }
  }
  const ptOnlyAg = document.getElementById("checkout-points-only-agree");
  if (ptOnlyAg) {
    ptOnlyAg.addEventListener("change", function () {
      syncPayButton();
    });
  }

  wireCheckoutPayButton();
  wirePaymentMethodUI();
  if (!(window as Window & { __pingCheckoutPointsReloadBound?: boolean }).__pingCheckoutPointsReloadBound) {
    (window as Window & { __pingCheckoutPointsReloadBound?: boolean }).__pingCheckoutPointsReloadBound =
      true;
    window.addEventListener("ping:checkout-reload-points", () => {
      void loadPointBalances().then(() => updatePointsDisplays(false));
    });
  }
  await loadPointBalances();
  if (typeof window.__PING_AWAIT_CHECKOUT_PORTONE_PROBE__ === "function") {
    await window.__PING_AWAIT_CHECKOUT_PORTONE_PROBE__(8000);
  }
  window.__PING_CHECKOUT_PORTONE_REFRESH_BANNER__?.();
  const pb = window.__PING_CHECKOUT_PORTONE_PROBE__ || { done: false, ok: false, emptyPayload: false };
  let probeHint = "";
  if (pb.done && !pb.ok) {
    probeHint =
      " (/api/portone-config.js 를 불러오지 못했습니다. npm run dev·Hosting 리라이트·PING_BACKEND_API_ORIGIN 확인)";
  } else if (pb.done && pb.ok && pb.emptyPayload) {
    probeHint = " (서버에 토스 결제위젯 키가 비었습니다. .env·PING_USE_TOSS_DOCS_TEST_KEYS 확인)";
  }
  const hasKey = !!(TOSS_WIDGET_CLIENT_KEY && String(TOSS_WIDGET_CLIENT_KEY).trim());
  const errEl = document.getElementById("checkout-error");
  if (!hasKey) {
    if (balanceTotal < orderTotal || orderTotal <= 0) {
      if (orderTotal > 0) {
        enableBankOnlyCheckout();
        wireCheckoutPayButton();
        return;
      }
      if (errEl) {
        errEl.className = "rounded-xl bg-red-50 text-red-800 text-sm p-4 mb-4";
        errEl.textContent =
          "카드·간편결제를 쓰려면 서버에 토스 결제위젯 키(test_gck_…)가 필요합니다. 보유 포인트가 주문 금액 이상일 때만 포인트로 전액 결제할 수 있습니다." +
          probeHint;
        errEl.classList.remove("hidden");
      }
      wireCheckoutPayButton();
      return;
    }
    pointsToUse = orderTotal;
    if (ptInp) {
      ptInp.value = String(orderTotal);
      ptInp.disabled = true;
    }
    document.getElementById("ping-ui-widget-wrap")?.classList.add("hidden");
    updatePointsDisplays(true);
    syncPayButton();
    wireCheckoutPayButton();
    return;
  }
  if (!pingIsTossWidgetV2ClientKey(TOSS_WIDGET_CLIENT_KEY) && !_pingPortoneCfg.tossAllowCkWidgetTry) {
    if (balanceTotal >= orderTotal && orderTotal > 0) {
      fallbackPointsOnlyWithoutCardWidget(
        "결제위젯용 클라이언트 키(test_gck_…)가 없어 카드 결제는 할 수 없습니다. 포인트로 주문 금액을 모두 차감하면 카드·간편결제 금액은 0원이 되며, 하단에서 결제를 완료할 수 있습니다." +
          probeHint,
      );
    } else {
      if (errEl) {
        errEl.className = "rounded-xl bg-red-50 text-red-800 text-sm p-4 mb-4";
        errEl.textContent =
          "결제위젯용 클라이언트 키(test_gck_…)가 필요합니다. 카드 결제를 하려면 키를 설정하거나, 포인트가 주문 금액 이상일 때만 전액 포인트 결제가 가능합니다." +
          probeHint;
        errEl.classList.remove("hidden");
      }
      wireCheckoutPayButton();
    }
    return;
  }
  const TossPayments = window.TossPayments;
  if (typeof TossPayments === "undefined") {
    if (balanceTotal >= orderTotal && orderTotal > 0) {
      fallbackPointsOnlyWithoutCardWidget("토스페이먼츠 SDK를 불러오지 못했습니다. 포인트로 전액 결제할 수 있습니다." + probeHint);
    } else {
      if (errEl) {
        errEl.className = "rounded-xl bg-red-50 text-red-800 text-sm p-4 mb-4";
        errEl.textContent = "토스페이먼츠 SDK를 불러오지 못했습니다." + probeHint;
        errEl.classList.remove("hidden");
      }
      wireCheckoutPayButton();
    }
    return;
  }
  try {
    if (!createTossWidgetsInstance()) {
      throw new Error("토스 결제위젯 인스턴스를 만들지 못했습니다.");
    }
    wirePaymentMethodUI();
    updatePointsDisplays(true);
    syncPayButton();
    wireCheckoutPayButton();
  } catch (err) {
    console.error(err);
    if (balanceTotal >= orderTotal && orderTotal > 0) {
      fallbackPointsOnlyWithoutCardWidget(
        "카드 결제 화면을 불러오지 못했습니다. 포인트로 전액(" +
          orderTotal.toLocaleString("ko-KR") +
          "원) 결제할 수 있습니다. 하단 버튼으로 진행해 주세요.",
      );
    } else {
      if (errEl) {
        errEl.className = "rounded-xl bg-red-50 text-red-800 text-sm p-4 mb-4";
        errEl.textContent = err instanceof Error ? err.message : "결제 UI를 불러오지 못했습니다.";
        errEl.classList.remove("hidden");
      }
      wireCheckoutPayButton();
    }
  }
}
