"use client";

import { useAdminAuthGuard } from "@/lib/admin-auth-session";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

function redirectKeyFromPath(pathname: string): string {
  if (pathname.includes("/service-status")) return "service-status";
  if (pathname.includes("/partner")) return "partner";
  if (pathname.includes("/dashboard")) return "dashboard";
  if (pathname.includes("/monitoring")) return "monitoring";
  return "monitoring";
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();

  const isAuthPage = pathname === "/admin/auth" || pathname.startsWith("/admin/auth/");
  const isPartnerSelfService =
    pathname.startsWith("/admin/partner") &&
    searchParams.get("admin") !== "true" &&
    !!searchParams.get("partner");

  const skipGuard = isAuthPage || isPartnerSelfService;
  const redirectKey = redirectKeyFromPath(pathname);
  const { ready } = useAdminAuthGuard(redirectKey, { enabled: !skipGuard });

  if (skipGuard) return <>{children}</>;

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-300">
        인증 확인 중...
      </div>
    );
  }

  return <>{children}</>;
}
