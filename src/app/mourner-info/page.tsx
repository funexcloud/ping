import type { Metadata } from "next";
import { Suspense } from "react";

import { PingPageLoading } from "@/components/ping-page-loading";
import MournerInfoClient from "./mourner-info-client";

export const metadata: Metadata = {
  title: "상주 정보 — PING",
};

export default function MournerInfoPage() {
  return (
    <Suspense fallback={<PingPageLoading />}>
      <MournerInfoClient />
    </Suspense>
  );
}
