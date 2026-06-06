import { Suspense } from "react";

import { PingPageLoading } from "@/components/ping-page-loading";
import ObituarySignupRegisterClient from "./obituary-signup-register-client";

export default function ObituarySignupRegisterPage() {
  return (
    <Suspense fallback={<PingPageLoading />}>
      <ObituarySignupRegisterClient />
    </Suspense>
  );
}
