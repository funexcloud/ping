import { PartnershipPageClient } from "@/app/partnership/partnership-page-client";
import { WebPageJsonLd } from "@/components/seo/site-json-ld";
import { buildPublicMetadata } from "@/lib/ping-site-seo";

export const metadata = buildPublicMetadata({
  title: "제휴문의 - PING",
  description: "PING 제휴·파트너십 문의 — 장례식장, 장례지도사, 상조·플랫폼 제휴",
  path: "/partnership",
  keywords: ["PING 제휴", "장례식장 제휴", "부고 발송 파트너"],
});

export default function PartnershipPage() {
  return (
    <>
      <WebPageJsonLd path="/partnership" title="PING 제휴문의" description="장례식장·장례지도사 제휴 문의" />
      <PartnershipPageClient />
    </>
  );
}
