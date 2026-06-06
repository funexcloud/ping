"use client";

/**
 * 인트로 게이트 후 `/start`(React 9단계)로 이동한다.
 */
import {
  homeBulkQueryRedirectPath,
  shouldHomeRedirectToBulkCheckout,
  stripHomeBulkResumeQuery,
} from "@/lib/ping-bulk-entry-query";
import { navigateToBulkCheckoutPrepare } from "@/lib/ping-bulk-checkout-prep";
import {
  pingApplyIntroSkipQueryToHistory,
  pingIntroOnReloadClearSeen,
  pingIntroSeen,
  pingSetIntroReturnPath,
} from "@/lib/ping-intro-gate";
import { PingPageLoading } from "@/components/ping-page-loading";
import { PING_MAIN_APP_PATH } from "@/lib/ping-main-path";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function HomeEntryInner() {
  const router = useRouter();
  const [msg, setMsg] = useState("불러오는 중…");

  useEffect(() => {
    try {
      pingApplyIntroSkipQueryToHistory();
      pingIntroOnReloadClearSeen();

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

      if (!pingIntroSeen()) {
        pingSetIntroReturnPath(PING_MAIN_APP_PATH);
        router.replace("/intro" + window.location.search + window.location.hash);
        return;
      }
      setMsg("메인 화면으로 이동합니다…");
      const q = window.location.search || "";
      const h = window.location.hash || "";
      router.replace(PING_MAIN_APP_PATH + q + h);
    } catch {
      window.location.replace(PING_MAIN_APP_PATH);
    }
  }, [router]);

  return <PingPageLoading label={msg} />;
}

export function HomeEntryClient() {
  return (
    <Suspense
      fallback={<PingPageLoading />}
    >
      <HomeEntryInner />
    </Suspense>
  );
}
