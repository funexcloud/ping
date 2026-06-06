import AdminAuthClient from "@/app/admin/auth/admin-auth-client";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "관리자 인증 - PING",
};

export default function AdminAuthPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">불러오는 중…</div>}>
      <AdminAuthClient />
    </Suspense>
  );
}
