import { IntroSeoBody } from "@/app/intro/intro-seo-body";
import { HowToJsonLd, WebPageJsonLd } from "@/components/seo/site-json-ld";
import { INTRO_DEMO_STEPS, INTRO_SEO } from "@/content/seo/intro-content";
import { buildPublicMetadata } from "@/lib/ping-site-seo";
import Script from "next/script";
import { IntroClient } from "./intro-client";
import { IntroHtmlClass } from "./intro-html-class";
import "./intro.css";

export const metadata = buildPublicMetadata({
  title: "PING · 사용 방법",
  description:
    "PING에서 부고를 준비하고 연락처를 가져와 한 번에 전달하는 흐름을 미리 봅니다.",
  path: "/intro",
  keywords: ["PING 소개", "부고 보내기 사용 방법"],
});

export default function IntroPage() {
  return (
    <>
      <WebPageJsonLd
        path="/intro"
        title="PING 서비스 안내"
        description="부고 대량발송 PING — 발송 흐름·비용·시작 방법 안내"
      />
      <HowToJsonLd
        name="PING 부고 대량발송 이용 안내"
        description={INTRO_SEO.lead}
        steps={INTRO_DEMO_STEPS}
      />
      <IntroSeoBody />
      <div className="intro-paint-guard" aria-hidden="true" />
      <IntroHtmlClass />
      <IntroClient />
      <Script src="/assets/js/ping-referral-points.js" strategy="lazyOnload" />
      {/* 15초·5,000원 참여 프로모 — 임시 중단 (assets/js 내 PING_ENGAGE_PROMO_PAUSED)
      <Script src="/assets/js/ping-engage-reward-popup.js" strategy="lazyOnload" />
      <Script src="/assets/js/ping-global-engage-countdown.js" strategy="lazyOnload" />
      */}
    </>
  );
}
