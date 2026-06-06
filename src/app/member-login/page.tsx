import { PING_NOINDEX_METADATA } from "@/lib/ping-site-seo";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PingPageLoading } from "@/components/ping-page-loading";
import MemberLoginClient from "./member-login-client";

export const metadata: Metadata = {
  ...PING_NOINDEX_METADATA,
  title: "PING · 회원 로그인",
};

export default function MemberLoginPage() {
  return (
    <Suspense fallback={<PingPageLoading />}>
      <MemberLoginClient />
    </Suspense>
  );
}
