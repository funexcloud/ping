import type { Metadata } from "next";
import { Suspense } from "react";
import ObituaryMortuaryClient from "./obituary-mortuary-client";

export const metadata: Metadata = {
  title: "PING · 장례 메시지",
  robots: { index: false, follow: false },
};

export default function ObituaryMortuaryPage() {
  return (
    <div className="ping-ui ob-flow-page min-h-screen">
      <Suspense fallback={<div className="p-6 text-center text-sm">불러오는 중…</div>}>
        <ObituaryMortuaryClient />
      </Suspense>
    </div>
  );
}
