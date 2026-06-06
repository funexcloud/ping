import { Suspense } from "react";
import { CondolenceClient } from "./condolence-client";

function CondolenceFallback() {
  return (
    <div className="mypage-body m-0 min-h-dvh bg-ping-bg pb-24 font-ping">
      <div className="px-6 py-12 text-center text-sm text-ping-muted">
        불러오는 중…
      </div>
    </div>
  );
}

export default function MypageCondolencePage() {
  return (
    <Suspense fallback={<CondolenceFallback />}>
      <CondolenceClient />
    </Suspense>
  );
}
