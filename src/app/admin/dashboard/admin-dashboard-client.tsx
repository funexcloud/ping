"use client";

import { isAdminAuthenticated } from "@/lib/admin-auth-session";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** admin-dashboard.html 은 unified-monitoring 과 동일 — /admin/monitoring 으로 보냄 */
export function AdminDashboardClient() {
  const router = useRouter();

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      router.replace("/admin/auth?redirect=dashboard");
      return;
    }
    router.replace("/admin/monitoring");
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-300">
      이동 중...
    </div>
  );
}
