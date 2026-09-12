"use client";

/**
 * 소비자 홈(`/`) — 대량 플로 재개 쿼리만 리다이렉트. 그 외에는 children(랜딩) 노출.
 */
import {
  homeBulkQueryRedirectPath,
  shouldHomeRedirectToBulkCheckout,
  stripHomeBulkResumeQuery,
} from "@/lib/ping-bulk-entry-query";
import { navigateToBulkCheckoutPrepare } from "@/lib/ping-bulk-checkout-prep";
import { PingPageLoading } from "@/components/ping-page-loading";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

function HomeBulkResumeGateInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (shouldHomeRedirectToBulkCheckout()) {
        stripHomeBulkResumeQuery();
        navigateToBulkCheckoutPrepare();
        return;
      }

      const bulkPath = homeBulkQueryRedirectPath();
      if (bulkPath) {
        router.replace(bulkPath);
        return;
      }
    } catch {
      /* 랜딩 노출 */
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <PingPageLoading label="불러오는 중…" />;
  }

  return <>{children}</>;
}

export function HomeBulkResumeGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PingPageLoading />}>
      <HomeBulkResumeGateInner>{children}</HomeBulkResumeGateInner>
    </Suspense>
  );
}
