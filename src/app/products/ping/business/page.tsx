import "@/app/overview/overview-landing.css";
import "@/app/overview/ping-saas-landing.css";
import { ProductPingLandingView } from "@/app/products/ping/product-ping-landing-view";
import { ProductsPingSeoBody } from "@/app/products/ping/products-ping-seo-body";
import { SeoPageSummary } from "@/components/seo/seo-page-summary";
import {
  FaqPageJsonLd,
  HowToJsonLd,
  WebPageJsonLd,
} from "@/components/seo/site-json-ld";
import { getProductPingContent } from "@/content/seo/products-ping-business-content";
import {
  buildPublicMetadata,
  PING_GEO_SUMMARY,
  PING_PRODUCT_BUSINESS_PATH,
} from "@/lib/ping-site-seo";

const businessContent = getProductPingContent("business");

export const metadata = buildPublicMetadata({
  title: "장례지도사·장례식장 부고 대량발송 — PING",
  description:
    "현장에서 부고 URL을 붙여넣으면 보안 처리 후 웹 대량발송. 장례 1건당 약 2분. 명단·엑셀·제휴 링크 지원.",
  path: PING_PRODUCT_BUSINESS_PATH,
  keywords: ["장례지도사 부고", "장례식장 발송", "부고 대량발송", "장례 제휴"],
});

export default function ProductPingBusinessPage() {
  return (
    <>
      <WebPageJsonLd
        path={PING_PRODUCT_BUSINESS_PATH}
        title="PING 장례업체 부고 대량발송"
        description="장례지도사·장례식장용 웹 대량발송"
      />
      <FaqPageJsonLd items={businessContent.faq.items} />
      <HowToJsonLd
        name="장례업체 PING 부고 발송"
        description="붙여넣기 → 확인 → 웹 대량발송"
        steps={businessContent.howItWorks.steps.map((s) => ({ name: s.title, text: s.desc }))}
      />
      <SeoPageSummary
        visuallyHidden
        title="PING — 장례업체 부고 대량발송"
        lead={PING_GEO_SUMMARY}
        bullets={[
          "장례 현장 부고 URL·엑셀 명단으로 웹 대량발송",
          "유가족 직접발송 대신 약 2분 수준 처리",
          "제휴·화이트라벨·엔터프라이즈 문의 가능",
        ]}
      />
      <ProductsPingSeoBody />
      <ProductPingLandingView audience="business" />
    </>
  );
}
