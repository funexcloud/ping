/**
 * `/start` 진입 쿼리 — 레거시 `index.html?mergeBulk=1` · `?bulkAfterUrl=1` 대응.
 */
import {
  PING_FLOW_KEY_OBITUARY_URL,
  PING_FLOW_KEY_ROUTE,
  PING_FLOW_KEY_STARTED,
  ROUTE_BULK_DIRECT,
  ROUTE_OBITUARY_THEN_BULK,
} from "@/lib/ping-flow-client";
import { loadPingFromIndexSnapshot } from "@/lib/ping-bulk-session";

export type BulkEntryQueryEffect =
  | {
      type: "mergeBulk";
      obituaryUrl: string;
      openGoogleContacts: boolean;
    }
  | { type: "bulkAfterUrl" }
  | { type: "openGoogleContacts" };

export function getPingObituaryPublicUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const fromFlow = sessionStorage.getItem(PING_FLOW_KEY_OBITUARY_URL);
    if (fromFlow) return String(fromFlow).trim();
  } catch {
    /* ignore */
  }
  const snap = loadPingFromIndexSnapshot();
  return String(snap.obituaryPageUrl || "").trim();
}

/** URL에서 대량 플로 쿼리를 읽고 history 에서 제거한다(1회). */
export function consumeBulkEntryQueryEffect(): BulkEntryQueryEffect | null {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  let effect: BulkEntryQueryEffect | null = null;

  if (sp.get("mergeBulk") === "1") {
    effect = {
      type: "mergeBulk",
      obituaryUrl: getPingObituaryPublicUrl(),
      openGoogleContacts:
        sp.get("openGoogleContacts") === "1" ||
        sp.get("bulkOpenGoogleContacts") === "1",
    };
    sp.delete("mergeBulk");
    sp.delete("openGoogleContacts");
    sp.delete("bulkOpenGoogleContacts");
  } else if (sp.get("bulkAfterUrl") === "1") {
    effect = { type: "bulkAfterUrl" };
    sp.delete("bulkAfterUrl");
  } else if (
    sp.get("openGoogleContacts") === "1" ||
    sp.get("bulkOpenGoogleContacts") === "1"
  ) {
    effect = { type: "openGoogleContacts" };
    sp.delete("openGoogleContacts");
    sp.delete("bulkOpenGoogleContacts");
  }

  if (effect) {
    const qs = sp.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash || ""}`,
    );
  }
  return effect;
}

export function markBulkFlowStarted(route: typeof ROUTE_BULK_DIRECT | typeof ROUTE_OBITUARY_THEN_BULK): void {
  try {
    sessionStorage.setItem(PING_FLOW_KEY_ROUTE, route);
    sessionStorage.setItem(PING_FLOW_KEY_STARTED, "1");
  } catch {
    /* ignore */
  }
}

/** 루트 `/?resumeBulk&autoPay` 등 — 홈 게이트에서 `/checkout` 으로 보낼지 */
export function shouldHomeRedirectToBulkCheckout(): boolean {
  if (typeof window === "undefined") return false;
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("resumeBulk") !== "1" && sp.get("autoPay") !== "1") return false;
  try {
    return sessionStorage.getItem("ping_bulk_identity_ok") === "1";
  } catch {
    return false;
  }
}

export function stripHomeBulkResumeQuery(): void {
  const sp = new URLSearchParams(window.location.search);
  sp.delete("resumeBulk");
  sp.delete("autoPay");
  const qs = sp.toString();
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash || ""}`,
  );
}

export function homeBulkQueryRedirectPath(): string | null {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("bulkAfterUrl") === "1") return "/start?bulkAfterUrl=1";
  if (sp.get("mergeBulk") === "1") {
    const extra =
      sp.get("openGoogleContacts") === "1" || sp.get("bulkOpenGoogleContacts") === "1"
        ? "&openGoogleContacts=1"
        : "";
    return `/start?mergeBulk=1${extra}`;
  }
  return null;
}
