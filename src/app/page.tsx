import "@/app/overview/overview-landing.css";
import "@/app/overview/ping-saas-landing.css";
import { HomeBulkResumeGate } from "@/app/home/home-bulk-resume-gate";
import { ProductPingLandingView } from "@/app/products/ping/product-ping-landing-view";
import { ProductsPingSeoBody } from "@/app/products/ping/products-ping-seo-body";
import { SeoPageSummary } from "@/components/seo/seo-page-summary";
import {
  FaqPageJsonLd,
  HowToJsonLd,
  WebPageJsonLd,
} from "@/components/seo/site-json-ld";
import {
  PRODUCTS_PING_FAQ_ALL,
  PRODUCTS_PING_HOWTO_JSONLD,
} from "@/content/seo/products-ping-content";
import {
  buildPublicMetadata,
  PING_CONSUMER_HOME_PATH,
  PING_GEO_SUMMARY,
} from "@/lib/ping-site-seo";

export const metadata = buildPublicMetadata({
  title: "부고 문자 한 번에 — 연락처를 가져와 전하는 PING",
  description:
    "스마트폰 주소록에서 연락처를 가져와 중요한 부고 소식을 선택한 사람에게 한 번에 전달하세요. 부고 보내기, 부고 알림, 단체 부고 문자를 PING에서 이어갈 수 있습니다.",
  path: PING_CONSUMER_HOME_PATH,
  keywords: ["부고 보내기", "부고 문자 보내기", "단체 부고 문자"],
});

/** 소비자 홈 — `/` (PING 메인 랜딩페이지) */
export default function ConsumerHomePage() {
  return (
    <>
      <WebPageJsonLd
        path={PING_CONSUMER_HOME_PATH}
        title="PING 부고 전달"
        description="연락처를 가져와 중요한 부고 소식을 한 번에 전달"
      />
      <FaqPageJsonLd items={PRODUCTS_PING_FAQ_ALL} />
      <HowToJsonLd
        name="PING으로 부고 보내기"
        description="부고 준비부터 연락처 가져오기, 발송까지 3단계"
        steps={PRODUCTS_PING_HOWTO_JSONLD}
      />
      <SeoPageSummary
        visuallyHidden
        title="PING — 연락처를 가져와 부고를 전하는 서비스"
        lead={PING_GEO_SUMMARY}
        bullets={[
          "부고 준비 → 연락처 가져오기 → 한 번에 발송",
          "선택한 사람에게만 전달하고 결과를 확인",
          "로그인은 발송을 이어갈 때 Google로 계속하기",
        ]}
      />
      <ProductsPingSeoBody />
      <HomeBulkResumeGate>
        <ProductPingLandingView audience="consumer" />
      </HomeBulkResumeGate>
    </>
  );
}
