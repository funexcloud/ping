import "@/app/overview/overview-landing.css";
import { OverviewPageView } from "@/app/overview/overview-page-view";
import { FaqPageJsonLd, WebPageJsonLd } from "@/components/seo/site-json-ld";
import {
  buildPublicMetadata,
  PING_OVERVIEW_FAQ,
  PING_PRODUCT_MARKETING_PATH,
} from "@/lib/ping-site-seo";

export const metadata = buildPublicMetadata({
  title: "PING - 부고부터 추모까지, 핑으로 정확하게",
  description:
    "부고 링크 검증, 연락처 반영, 알림톡·SMS 발송 채널 선택, 신청자 확인·결제까지. PING으로 장례 커뮤니케이션을 한 화면에서 빠르게 운영하세요.",
  path: PING_PRODUCT_MARKETING_PATH,
  keywords: ["부고 발송", "장례 SaaS", "알림톡 장례", "PING 제품"],
});

/** 마케팅 상세 — SEO·기능 소개·요금 요약·도입 CTA */
export default function ProductPingPage() {
  return (
    <>
      <WebPageJsonLd
        path={PING_PRODUCT_MARKETING_PATH}
        title="PING 서비스 소개"
        description="부고부터 발송·확인·추모까지 연결하는 부고 커뮤니케이션 플랫폼"
      />
      <FaqPageJsonLd items={PING_OVERVIEW_FAQ} />
      <OverviewPageView />
    </>
  );
}
