import { AdminLayoutClient } from "@/app/admin/admin-layout-client";
import { PING_NOINDEX_METADATA } from "@/lib/ping-site-seo";
import type { ReactNode } from "react";
import { Suspense } from "react";
import "../admin-desktop.css";

export const metadata = PING_NOINDEX_METADATA;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-desktop-root">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-300">
            불러오는 중…
          </div>
        }
      >
        <AdminLayoutClient>{children}</AdminLayoutClient>
      </Suspense>
    </div>
  );
}
