import { HomeEntryClient } from "@/app/home/home-entry-client";
import { SeoPageSummary } from "@/components/seo/seo-page-summary";
import { WebPageJsonLd } from "@/components/seo/site-json-ld";
import { buildPublicMetadata, PING_GEO_SUMMARY } from "@/lib/ping-site-seo";

export const metadata = buildPublicMetadata({
  title: "PING - 부고 대량발송",
  description:
    "빠르고 정확한 부고 안내 문자·알림톡 대량발송. 엑셀·주소록 업로드부터 발송·결제까지 3분. 알림톡 실패 시 SMS 자동 대체발송.",
  path: "/",
  keywords: ["부고 대량발송", "알림톡 부고", "엑셀 문자"],
});

export default function HomePage() {
  return (
    <>
      <WebPageJsonLd
        path="/"
        title="PING - 부고 대량발송"
        description="부고 URL 검증·주소록·알림톡·SMS 대량 발송 SaaS"
      />
      <SeoPageSummary
        visuallyHidden
        title="PING — 부고 대량발송 서비스"
        lead={PING_GEO_SUMMARY}
        bullets={[
          "부고 링크 검증 후 수신자 주소록(엑셀·Google) 반영",
          "카카오 알림톡·SMS·LMS·MMS 건당 과금 발송",
          "비회원 결제 지원 · 장례식장·장례지도사 업무 흐름에 맞춘 웹 UI",
        ]}
      />
      <HomeEntryClient />
    </>
  );
}
