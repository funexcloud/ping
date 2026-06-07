"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** @deprecated 레거시 클라이언트 플래그 — 신규 코드는 verifyAdminSession / useAdminAuthGuard 사용 */
export const ADMIN_AUTH_KEY = "ping_admin_auth";
export const ADMIN_AUTH_TS_KEY = "ping_admin_auth_timestamp";

/** 실제 인증은 httpOnly 쿠키(ping_admin_session) — 서버 GET /api/admin/auth/session 으로 검증 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/auth/session", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return false;
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      authenticated?: boolean;
    };
    return json.ok === true && json.authenticated === true;
  } catch {
    return false;
  }
}

/** @deprecated verifyAdminSession 사용 */
export function isAdminAuthenticated(): boolean {
  return false;
}

/** @deprecated 로그인 API가 쿠키를 설정함 — 호출 불필요 */
export function setAdminAuthenticated(): void {
  /* no-op */
}

export function clearAdminAuth(): void {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(ADMIN_AUTH_TS_KEY);
  sessionStorage.removeItem("ping_x_ping_admin_secret");
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

type AdminAuthGuardOptions = {
  enabled?: boolean;
};

/** /admin/* 진입 시 서버 세션 쿠키 검증 후 미인증이면 로그인으로 이동 */
export function useAdminAuthGuard(
  redirectKey: string,
  opts?: AdminAuthGuardOptions,
): { ready: boolean; authenticated: boolean } {
  const router = useRouter();
  const enabled = opts?.enabled !== false;
  const [ready, setReady] = useState(!enabled);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      setAuthenticated(false);
      return;
    }

    let cancelled = false;
    void verifyAdminSession().then((ok) => {
      if (cancelled) return;
      if (!ok) {
        const q = redirectKey ? `?redirect=${encodeURIComponent(redirectKey)}` : "";
        router.replace(`/admin/auth${q}`);
        return;
      }
      setAuthenticated(true);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, redirectKey, router]);

  return { ready, authenticated };
}
