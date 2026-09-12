/** 파트너 유입 코드 — `?partner=` → sessionStorage → Firestore `ping_orders.partner` */

export const PING_PARTNER_SESSION_KEY = "ping_partner_code";
export const PING_DIRECT_PARTNER_CODE = "direct";
export const PING_DIRECT_PARTNER_LABEL = "PING 직접";

/** URL·주문 필드용 파트너 코드 정규화. `direct`/빈 값은 null(직접 유입). */
export function normalizePartnerCode(raw: unknown): string | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s || s === PING_DIRECT_PARTNER_CODE) return null;
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(s)) return null;
  return s;
}

/** 통계·필터용 버킷 코드 (null → `direct`) */
export function partnerBucketCode(partner: string | null | undefined): string {
  return normalizePartnerCode(partner) ?? PING_DIRECT_PARTNER_CODE;
}

export function formatPartnerLabel(
  code: string,
  registered?: { name?: string } | null,
): string {
  if (code === PING_DIRECT_PARTNER_CODE) return PING_DIRECT_PARTNER_LABEL;
  const name = String(registered?.name || "").trim();
  return name || code;
}

export function readPartnerCodeFromSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizePartnerCode(sessionStorage.getItem(PING_PARTNER_SESSION_KEY));
  } catch {
    return null;
  }
}

/** 현재 URL의 `partner` 쿼리를 세션에 저장(있을 때만). 저장 후 URL에서 제거. */
export function capturePartnerAttributionFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  if (!sp.has("partner")) return readPartnerCodeFromSession();

  const code = normalizePartnerCode(sp.get("partner"));
  try {
    if (code) sessionStorage.setItem(PING_PARTNER_SESSION_KEY, code);
    else sessionStorage.removeItem(PING_PARTNER_SESSION_KEY);
  } catch {
    /* ignore */
  }

  sp.delete("partner");
  const qs = sp.toString();
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash || ""}`,
  );

  return code;
}
