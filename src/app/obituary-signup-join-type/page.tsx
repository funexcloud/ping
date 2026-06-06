import { Suspense } from "react";

import { PingPageLoading } from "@/components/ping-page-loading";
import ObituarySignupJoinTypeClient from "./obituary-signup-join-type-client";

export default function ObituarySignupJoinTypePage() {
  return (
    <Suspense fallback={<PingPageLoading />}>
      <ObituarySignupJoinTypeClient />
    </Suspense>
  );
}
