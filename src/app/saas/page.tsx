import { WebPageJsonLd } from "@/components/seo/site-json-ld";
import { buildPublicMetadata, PING_SITE_URL } from "@/lib/ping-site-seo";
import { SaasLandingClient } from "./saas-landing-client";

const SAAS_OG = `${PING_SITE_URL}/assets/og/og-saas-landing.png`;

export const metadata = buildPublicMetadata({
  title: "Ping - 엔터프라이즈 보안 장례 발송 인프라",
  description:
    "민감한 유족 개인정보를 Zero-Trust로 보호하는 장례 발송 인프라. 화이트라벨 SaaS로 귀사 브랜드의 대량발송 시스템을 구축하세요.",
  path: "/saas",
  keywords: ["장례 SaaS", "화이트라벨 부고", "엔터프라이즈 장례 발송"],
  ogImage: SAAS_OG,
});

export default function SaasLandingPage() {
  return (
    <>
      <WebPageJsonLd
        path="/saas"
        title="PING 엔터프라이즈 장례 발송"
        description="화이트라벨·보안 격리 대량 발송 SaaS 인프라"
      />
      <SaasLandingClient />
    </>
  );
}
