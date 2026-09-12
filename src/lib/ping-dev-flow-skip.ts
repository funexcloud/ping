/** 로컬 개발 전용. production 번들에서는 컴파일 시 제거된다. */
import { persistBulkComposeToPingFromIndex } from "@/lib/ping-bugo-import-flow";
import { PING_CHECKOUT_SESSION } from "@/lib/ping-bulk-checkout-prep";
import { getStaticBulkTemplateBody, type BulkSmsTemplateId } from "@/lib/ping-bulk-sms";
import { saveBulkRecipientsToSession } from "@/lib/ping-bulk-session";

export const PING_DEV_PREVIEW_URL =
  "https://www.ulsan.go.kr/funeral/obituary/kim-youngsoo";

const PREVIEW_FLAG_KEY = "ping_dev_flow_preview";
const WIZARD_STEP_KEY = "ping_dev_wizard_step";
const PAY_SUCCESS_SESSION_KEY = "ping_pay_success_session";

export const PING_DEV_PREVIEW_ORDER_ID = "DEV-PREVIEW";
export const PING_DEV_PREVIEW_AMOUNT = 220;

export type PingDevWizardStep = "url" | "compose" | "pick";

/** 본인확인~발송완료 미리보기 순서 */
export const PING_DEV_IDENTITY_TOUR = [
  "/login",
  "/member-login?from=entry&method=email",
  "/obituary-signup-terms?method=email&join=general",
  "/obituary-signup-register?method=email&join=general",
  "/obituary-verify-email?email=dev%40ping.local&from=signup&join=general",
  "/member-login?from=entry&method=email&verified=1&email=dev%40ping.local",
  "/obituary-guest-verify?method=guest&join=general",
  "/checkout",
  "/payment-success?orderId=DEV-PREVIEW&amount=220&count=2&channel=sms",
] as const;

/** 디지털 방명록 미리보기 순서 — 첫 화면은 방명록 로그인 */
export const PING_DEV_CONDOLENCE_TOUR = [
  "/condolence/login",
  "/condolence/signup/terms?method=email&join=general",
  "/condolence/signup/register?method=email&join=general",
  "/condolence/signup/verify-email?email=dev%40ping.local&from=signup&join=general",
  "/condolence/login?verified=1&email=dev%40ping.local",
  "/condolence/signup/guest-verify?method=guest&join=general",
  "/condolence/book",
] as const;

export function isPingDevFlowSkipEnabled() {
  return process.env.NODE_ENV === "development";
}

export function markPingDevFlowPreview() {
  try {
    sessionStorage.setItem(PREVIEW_FLAG_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function isPingDevFlowPreview() {
  if (!isPingDevFlowSkipEnabled()) return false;
  try {
    return sessionStorage.getItem(PREVIEW_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function writePingDevWizardStep(step: PingDevWizardStep) {
  try {
    sessionStorage.setItem(WIZARD_STEP_KEY, step);
  } catch {
    /* private mode */
  }
}

function parsePingDevWizardStep(raw: string | null): PingDevWizardStep | null {
  if (raw === "url" || raw === "compose" || raw === "pick") return raw;
  if (raw === "review") return "pick";
  return null;
}

export function peekPingDevWizardStep(): PingDevWizardStep | null {
  try {
    return parsePingDevWizardStep(sessionStorage.getItem(WIZARD_STEP_KEY));
  } catch {
    return null;
  }
}

export function consumePingDevWizardStep(): PingDevWizardStep | null {
  try {
    const parsed = parsePingDevWizardStep(sessionStorage.getItem(WIZARD_STEP_KEY));
    sessionStorage.removeItem(WIZARD_STEP_KEY);
    return parsed;
  } catch {
    return null;
  }
}

export function seedPingDevBulkPreviewSession(opts?: {
  title?: string;
  body?: string;
  templateId?: BulkSmsTemplateId;
}) {
  const templateId: BulkSmsTemplateId = opts?.templateId === "2" ? "2" : "1";
  const body = String(opts?.body || "").trim() || getStaticBulkTemplateBody(templateId);
  const title = opts?.title ?? "개발 미리보기";
  persistBulkComposeToPingFromIndex({
    title,
    body,
    templateId,
    obituaryPageUrl: PING_DEV_PREVIEW_URL,
    bulkFlowKind: "obituary",
  });
  saveBulkRecipientsToSession(
    [
      { phone: "01000000001", label: "미리보기1", name: "미리보기1" },
      { phone: "01000000002", label: "미리보기2", name: "미리보기2" },
    ],
    { bulkFlowKind: "obituary" },
  );
  try {
    sessionStorage.setItem("ping_flow_route", "bulk_direct");
    sessionStorage.setItem("ping_flow_started", "1");
  } catch {
    /* private mode */
  }
  return { url: PING_DEV_PREVIEW_URL, title, body, templateId };
}

export function seedPingDevCheckoutPreviewSession() {
  seedPingDevBulkPreviewSession();
  try {
    sessionStorage.setItem("ping_bulk_identity_ok", "1");
    sessionStorage.setItem(
      PING_CHECKOUT_SESSION,
      JSON.stringify({
        orderId: PING_DEV_PREVIEW_ORDER_ID,
        amount: PING_DEV_PREVIEW_AMOUNT,
        orderName: "PING 부고 문자 · 2건",
        customerName: "미리보기",
        customerMobilePhone: "01000000001",
        customerEmail: "dev@ping.local",
        recipientCount: 2,
        preferredSendChannel: "sms",
        sendChannelLabel: "문자",
        checkoutSecret: "dev-preview",
      }),
    );
  } catch {
    /* private mode */
  }
}

export function seedPingDevPaySuccessPreviewSession() {
  seedPingDevCheckoutPreviewSession();
  try {
    sessionStorage.setItem(
      PAY_SUCCESS_SESSION_KEY,
      JSON.stringify({
        orderId: PING_DEV_PREVIEW_ORDER_ID,
        amount: PING_DEV_PREVIEW_AMOUNT,
        count: 2,
        channel: "sms",
        ts: Date.now(),
      }),
    );
  } catch {
    /* private mode */
  }
}

function normalizePathname(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

function parseSearch(search: string) {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

function matchTourHref(
  href: string,
  path: string,
  have: URLSearchParams,
  allowMissingQuery: boolean,
) {
  const [tourPath, tourQuery] = href.split("?");
  if (tourPath !== path) return false;
  if (!tourQuery) return true;
  const want = new URLSearchParams(tourQuery);
  for (const [key, value] of want) {
    const got = have.get(key);
    if (got == null) {
      if (allowMissingQuery) continue;
      return false;
    }
    if (got !== value) return false;
  }
  return true;
}

function findTourIndex(
  tour: readonly string[],
  path: string,
  have: URLSearchParams,
  allowMissingQuery: boolean,
) {
  return tour.findIndex((href) =>
    matchTourHref(href, path, have, allowMissingQuery),
  );
}

function condolenceTourIndex(path: string, have: URLSearchParams) {
  return findTourIndex(PING_DEV_CONDOLENCE_TOUR, path, have, true);
}

/** 마케팅 로그인·디지털 방명록 개발 미리보기 구간인지 */
export function isPingDevCondolenceTourLocation(
  pathname: string,
  search = "",
): boolean {
  const path = normalizePathname(pathname);
  const have = parseSearch(search);
  if (path === "/condolence" || path.startsWith("/condolence/")) return true;
  return path === "/member-login" && have.get("from") === "marketing";
}

export function pingDevIdentityNextHrefFromLocation(
  pathname: string,
  search = "",
): string | null {
  const path = normalizePathname(pathname);
  const have = parseSearch(search);
  if (isPingDevCondolenceTourLocation(path, have.toString())) {
    const index = condolenceTourIndex(path, have);
    if (index < 0) return PING_DEV_CONDOLENCE_TOUR[0];
    return PING_DEV_CONDOLENCE_TOUR[
      (index + 1) % PING_DEV_CONDOLENCE_TOUR.length
    ];
  }
  if (path === "/send/payments") return PING_DEV_IDENTITY_TOUR[0];
  const index = findTourIndex(PING_DEV_IDENTITY_TOUR, path, have, false);
  if (index < 0) return PING_DEV_IDENTITY_TOUR[0];
  return PING_DEV_IDENTITY_TOUR[index + 1] ?? null;
}

export function pingDevIdentityPrevHrefFromLocation(
  pathname: string,
  search = "",
): string | null {
  const path = normalizePathname(pathname);
  const have = parseSearch(search);
  if (isPingDevCondolenceTourLocation(path, have.toString())) {
    const index = condolenceTourIndex(path, have);
    if (index < 0) return PING_DEV_CONDOLENCE_TOUR.at(-1) ?? null;
    return PING_DEV_CONDOLENCE_TOUR[
      (index - 1 + PING_DEV_CONDOLENCE_TOUR.length) %
        PING_DEV_CONDOLENCE_TOUR.length
    ];
  }
  if (path === "/send/payments") return "/start";
  const index = findTourIndex(PING_DEV_IDENTITY_TOUR, path, have, false);
  if (index <= 0) return "/send/payments";
  return PING_DEV_IDENTITY_TOUR[index - 1];
}

export function pingDevIdentityNextHref(): string | null {
  if (typeof window === "undefined") return null;
  return pingDevIdentityNextHrefFromLocation(
    window.location.pathname,
    window.location.search,
  );
}

export function pingDevIdentityPrevHref(): string | null {
  if (typeof window === "undefined") return null;
  return pingDevIdentityPrevHrefFromLocation(
    window.location.pathname,
    window.location.search,
  );
}

/** 개발 로그인 후 이동 — 남은 본인확인을 건너뛰고 다음 실화면으로 */
export function pingDevLoginContinueHrefFromLocation(
  pathname: string,
  search = "",
): string {
  const path = normalizePathname(pathname);
  const have = parseSearch(search);
  if (isPingDevCondolenceTourLocation(path, have.toString())) {
    return "/condolence/book";
  }
  if (path === "/payment-success") {
    const q = search.startsWith("?") ? search : search ? `?${search}` : "";
    return `/payment-success${q}`;
  }
  if (path === "/checkout") {
    return `/payment-success?orderId=${PING_DEV_PREVIEW_ORDER_ID}&amount=${PING_DEV_PREVIEW_AMOUNT}&count=2&channel=sms`;
  }
  return "/checkout";
}

export function pingDevGoIdentityHref(href: string) {
  markPingDevFlowPreview();
  const condolence = isPingDevCondolenceTourLocation(
    href.split("?")[0] || "/",
    href.includes("?") ? href.slice(href.indexOf("?") + 1) : "",
  );
  if (!condolence) {
    seedPingDevBulkPreviewSession();
    if (href.startsWith("/checkout")) seedPingDevCheckoutPreviewSession();
    if (href.startsWith("/payment-success")) seedPingDevPaySuccessPreviewSession();
    if (href === "/start") writePingDevWizardStep("pick");
  }
  if (typeof window !== "undefined") {
    const dest = new URL(href, window.location.origin);
    if (
      normalizePathname(dest.pathname) ===
        normalizePathname(window.location.pathname) &&
      dest.search === window.location.search
    ) {
      window.location.reload();
      return;
    }
  }
  window.location.href = href;
}
