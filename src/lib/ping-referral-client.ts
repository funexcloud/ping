const LS_CODE = "ping_my_referral_code";
const LS_VISITOR = "ping_referral_visitor_id";
const LS_LOCAL_PTS = "ping_user_points_balance";

function normCode(v: string): string {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);
}

function genCode(): string {
  try {
    const a = new Uint8Array(8);
    crypto.getRandomValues(a);
    let s = "";
    for (let i = 0; i < a.length; i++) s += (a[i] % 36).toString(36);
    return s;
  } catch {
    return `r${Math.random().toString(36).slice(2, 10)}`;
  }
}

function genVisitorId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateVisitorId(): string {
  try {
    const v = localStorage.getItem(LS_VISITOR);
    if (v && v.length > 8) return v;
    const next = genVisitorId();
    localStorage.setItem(LS_VISITOR, next);
    return next;
  } catch {
    return genVisitorId();
  }
}

export function getOrCreateMyCode(): string {
  try {
    let c = normCode(localStorage.getItem(LS_CODE) || "");
    if (c.length >= 4) return c;
    c = genCode();
    while (c.length < 4) c += genCode();
    c = c.slice(0, 10);
    localStorage.setItem(LS_CODE, c);
    return c;
  } catch {
    return genCode().slice(0, 10);
  }
}

export function shareUrlForCode(code: string): string {
  if (typeof window === "undefined") return "/start";
  try {
    const u = new URL("/start", window.location.origin);
    u.searchParams.set("ref", code);
    return u.href;
  } catch {
    return `/start?ref=${encodeURIComponent(code)}`;
  }
}

export function getShareUrl(): string {
  return shareUrlForCode(getOrCreateMyCode());
}

export function readLocalMiscPoints(): number {
  try {
    const n = parseInt(localStorage.getItem(LS_LOCAL_PTS) || "0", 10);
    return Number.isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

async function postJson(path: string, body: unknown) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`http_${r.status}`);
  return r.json();
}

async function getJson(path: string) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`http_${r.status}`);
  return r.json();
}

export async function registerMyCode(): Promise<string> {
  const code = getOrCreateMyCode();
  try {
    await postJson("/api/referral/register", { code });
  } catch {
    /* server optional */
  }
  return code;
}

export type ReferralBalance = {
  ok: boolean;
  points: number;
  friendCount: number;
  rewardPerFriend?: number;
};

export async function fetchReferralBalance(): Promise<ReferralBalance> {
  const code = getOrCreateMyCode();
  try {
    const j = (await getJson(
      `/api/referral/balance?code=${encodeURIComponent(code)}`,
    )) as ReferralBalance;
    if (j && j.ok) return j;
  } catch {
    /* ignore */
  }
  return { ok: false, points: 0, friendCount: 0, rewardPerFriend: 100 };
}

export async function consumeRefFromUrlIfAny(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const u = new URL(window.location.href);
    const ref = normCode(u.searchParams.get("ref") || u.searchParams.get("r") || "");
    if (ref.length < 4) return;

    const mine = normCode(localStorage.getItem(LS_CODE) || "");
    if (mine && ref === mine) {
      u.searchParams.delete("ref");
      u.searchParams.delete("r");
      const qs = u.searchParams.toString();
      window.history.replaceState(
        {},
        document.title,
        u.pathname + u.hash + (qs ? `?${qs}` : ""),
      );
      return;
    }

    const visitorId = getOrCreateVisitorId();
    await postJson("/api/referral/friend-visit", { refCode: ref, visitorId });

    u.searchParams.delete("ref");
    u.searchParams.delete("r");
    const qs = u.searchParams.toString();
    window.history.replaceState(
      {},
      document.title,
      u.pathname + u.hash + (qs ? `?${qs}` : ""),
    );
  } catch {
    /* retry on next visit */
  }
}
