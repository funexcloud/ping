/** 관리자 UI 세션 플래그 — 실제 인증은 httpOnly 쿠키(ping_admin_session) */
export const ADMIN_AUTH_KEY = "ping_admin_auth";
export const ADMIN_AUTH_TS_KEY = "ping_admin_auth_timestamp";

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === "authenticated";
}

export function setAdminAuthenticated(): void {
  sessionStorage.setItem(ADMIN_AUTH_KEY, "authenticated");
  sessionStorage.setItem(ADMIN_AUTH_TS_KEY, String(Date.now()));
}

export function clearAdminAuth(): void {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(ADMIN_AUTH_TS_KEY);
}

/** redirect 쿼리 → App Router 경로 */
export function resolveAdminRedirect(raw: string | null): string {
  const map: Record<string, string> = {
    "unified-monitoring.html": "/admin/monitoring",
    "admin-dashboard.html": "/admin/monitoring",
    "service-status.html": "/admin/service-status",
    "partner-dashboard.html": "/admin/partner",
    monitoring: "/admin/monitoring",
    dashboard: "/admin/monitoring",
    "service-status": "/admin/service-status",
    partner: "/admin/partner",
  };
  const v = String(raw || "").trim();
  if (v.startsWith("/admin/")) return v;
  return map[v] || "/admin/monitoring";
}

/** 관리 API — 세션 쿠키 포함 */
export async function adminApiFetch(
  input: string,
  init: RequestInit & { json?: Record<string, unknown> } = {},
): Promise<Response> {
  const { json, headers, ...rest } = init;
  const h = new Headers(headers);
  if (json != null) {
    h.set("Content-Type", "application/json");
  }
  return fetch(input, {
    ...rest,
    credentials: "include",
    headers: h,
    body: json != null ? JSON.stringify(json) : rest.body,
  });
}
