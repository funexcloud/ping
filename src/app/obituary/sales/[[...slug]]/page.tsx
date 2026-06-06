import type { Metadata } from "next";
import { Suspense } from "react";
import ObituarySalesClient from "./obituary-sales-client";

export const metadata: Metadata = {
  title: "PING · 판매 관리",
  robots: { index: false, follow: false },
};

export default function ObituarySalesPage() {
  return (
    <div className="ping-ui ob-flow-page min-h-screen">
      <Suspense fallback={<div className="p-6 text-center text-sm">불러오는 중…</div>}>
        <ObituarySalesClient />
      </Suspense>
    </div>
  );
}
