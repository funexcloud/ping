import { AdminDashboardClient } from "@/app/admin/dashboard/admin-dashboard-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "통합모니터링 - PING",
  description: "전체 파트너 및 주문 관리",
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
