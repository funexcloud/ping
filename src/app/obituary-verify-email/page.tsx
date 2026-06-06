import { Suspense } from "react";

import { PingPageLoading } from "@/components/ping-page-loading";
import ObituaryVerifyEmailClient from "./obituary-verify-email-client";

export default function ObituaryVerifyEmailPage() {
  return (
    <Suspense fallback={<PingPageLoading />}>
      <ObituaryVerifyEmailClient />
    </Suspense>
  );
}
