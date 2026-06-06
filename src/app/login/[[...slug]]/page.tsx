import { PING_NOINDEX_METADATA } from "@/lib/ping-site-seo";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PingPageLoading } from "@/components/ping-page-loading";
import ObEntryClient from "../ob-entry-client";

export const metadata: Metadata = {
  ...PING_NOINDEX_METADATA,
  title: "PING · 부고 만들기",
};

export default function LoginCatchAllPage() {
  return (
    <Suspense fallback={<PingPageLoading />}>
      <ObEntryClient />
    </Suspense>
  );
}
