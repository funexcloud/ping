import { Suspense } from "react";

import { PingPageLoading } from "@/components/ping-page-loading";
import ObituaryGuestVerifyClient from "./obituary-guest-verify-client";

export default function ObituaryGuestVerifyPage() {
  return (
    <Suspense fallback={<PingPageLoading />}>
      <ObituaryGuestVerifyClient />
    </Suspense>
  );
}
