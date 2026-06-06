import ObituaryReviewClient from "@/app/obituary/review/obituary-review-client";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "PING - 부고 확인",
  robots: { index: false, follow: false },
};

export default function ObituaryReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">불러오는 중…</div>
      }
    >
      <ObituaryReviewClient />
    </Suspense>
  );
}
