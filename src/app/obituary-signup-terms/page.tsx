import { Suspense } from "react";

import { PingPageLoading } from "@/components/ping-page-loading";
import ObituarySignupTermsClient from "./obituary-signup-terms-client";

export default function ObituarySignupTermsPage() {
  return (
    <Suspense fallback={<PingPageLoading />}>
      <ObituarySignupTermsClient />
    </Suspense>
  );
}
