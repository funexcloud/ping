import ObituaryPublicClient from "@/app/obituary/public/obituary-public-client";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "PING · 부고 안내",
  robots: { index: false, follow: false },
};

export default function ObituaryPublicPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">불러오는 중…</div>
      }
    >
      <ObituaryPublicClient />
    </Suspense>
  );
}
