/** 회원 로그인 후 checkout 최초 1회 웰컴 보너스 (1P = 1원) */
export const PING_MEMBER_WELCOME_POINTS = 50;
export const PING_MEMBER_WELCOME_GIFT_WON = 5500;
export const PING_CHECKOUT_WELCOME_PENDING_KEY = "ping_checkout_welcome_pending";

export function readMemberIdFromSession(): string {
  if (typeof window === "undefined") return "";
  try {
    const token = sessionStorage.getItem("ping_auth_token");
    if (!token) return "";
    const raw = sessionStorage.getItem("ping_auth_user");
    if (!raw) return "";
    const user = JSON.parse(raw) as { id?: string };
    return String(user.id || "").trim();
  } catch {
    return "";
  }
}

export function isCheckoutWelcomePending(): boolean {
  try {
    return sessionStorage.getItem(PING_CHECKOUT_WELCOME_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearCheckoutWelcomePending(): void {
  try {
    sessionStorage.removeItem(PING_CHECKOUT_WELCOME_PENDING_KEY);
  } catch {
    /* noop */
  }
}

export function markCheckoutWelcomePending(): void {
  try {
    sessionStorage.setItem(PING_CHECKOUT_WELCOME_PENDING_KEY, "1");
  } catch {
    /* noop */
  }
}

export type MemberWelcomeClaimResult = {
  ok?: boolean;
  alreadyClaimed?: boolean;
  added?: number;
  points?: number;
  engagePoints?: number;
  giftValueWon?: number;
  message?: string;
  error?: string;
};

export async function claimMemberWelcomeBonus(opts: {
  memberId: string;
  deviceId: string;
}): Promise<MemberWelcomeClaimResult> {
  const res = await fetch("/api/reward/member-welcome", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      memberId: opts.memberId,
      deviceId: opts.deviceId,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as MemberWelcomeClaimResult;
  if (!res.ok) {
    return { ok: false, error: json.error || "claim_failed" };
  }
  return json;
}
