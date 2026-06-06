import { Suspense } from "react";

import { PingPageLoading } from "@/components/ping-page-loading";
import ObituaryCreateClient from "./obituary-create-client";

export default function ObituaryCreatePage() {
  return (
    <Suspense fallback={<PingPageLoading />}>
      <ObituaryCreateClient />
    </Suspense>
  );
}
