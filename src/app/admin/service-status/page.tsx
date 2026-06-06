import { AdminServiceStatusClient } from "@/app/admin/service-status/admin-service-status-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스현황 - PING",
  description: "PING 서비스 전체 현황 및 모니터링",
};

export default function AdminServiceStatusPage() {
  return <AdminServiceStatusClient />;
}
