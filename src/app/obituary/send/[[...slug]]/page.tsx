import type { Metadata } from "next";
import { Suspense } from "react";
import ObituarySendClient from "./obituary-send-client";

export const metadata: Metadata = {
  title: "PING · 부고 보내기",
  robots: { index: false, follow: false },
};

export default function ObituarySendPage() {
  return (
    <div className="ping-ui ob-flow-page min-h-screen">
      <Suspense fallback={<div className="p-6 text-center text-sm">불러오는 중…</div>}>
        <ObituarySendClient />
      </Suspense>
    </div>
  );
}
