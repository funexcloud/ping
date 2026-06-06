import { AdminPartnerClient } from "@/app/admin/partner/admin-partner-client";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "파트너 대시보드 - PING",
  description: "파트너 주문 및 매출 현황",
};

export default function AdminPartnerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">불러오는 중…</div>}>
      <AdminPartnerClient />
    </Suspense>
  );
}
