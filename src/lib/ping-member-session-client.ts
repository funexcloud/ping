export const PING_AUTH_TOKEN_KEY = "ping_auth_token";
export const PING_AUTH_USER_KEY = "ping_auth_user";
/** Client gate only. Server APIs still require HttpOnly FUNEX/legacy cookies. */
export const PING_FUNEX_PRESENT_KEY = "ping_funex_present";

export function persistPingMemberSession(token: unknown, user: unknown): boolean {
  if (typeof window === "undefined") return false;
  const value = String(token || "").trim();
  if (!value) return false;
  try {
    sessionStorage.setItem(PING_AUTH_TOKEN_KEY, value);
    sessionStorage.setItem(PING_AUTH_USER_KEY, JSON.stringify(user ?? {}));
    notifyPingMemberSessionChanged();
    return true;
  } catch {
    return false;
  }
}

export function isPingMemberLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (String(sessionStorage.getItem(PING_AUTH_TOKEN_KEY) || "").trim()) return true;
    return sessionStorage.getItem(PING_FUNEX_PRESENT_KEY) === "1";
  } catch {
    return false;
  }
}

export async function hydratePingFunexSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/auth/funex/session", {
      credentials: "include",
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as { authenticated?: boolean } | null;
    if (json?.authenticated) {
      sessionStorage.setItem(PING_FUNEX_PRESENT_KEY, "1");
      notifyPingMemberSessionChanged();
      return true;
    }
    sessionStorage.removeItem(PING_FUNEX_PRESENT_KEY);
    notifyPingMemberSessionChanged();
    return false;
  } catch {
    return false;
  }
}

export function notifyPingMemberSessionChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("ping-member-session"));
  } catch {
    /* noop */
  }
}
