import { ResponsiveHeroBanner } from "@/components/ui/responsive-hero-banner";
import { LANDING_FINAL_HERO_BACKGROUND } from "@/content/landing/landing-config";
import type { ProductPingLandingContent } from "@/content/seo/products-ping-types";
import { LANDING_FINAL_CTA } from "@/lib/intro/config";
import type { ReactNode } from "react";

export function LandingFinalHeroBanner({
  content,
  sectionId = "start",
  title = "지금 부고를",
  titleLine2 = "한 번에 전하세요",
  primaryButtonText = LANDING_FINAL_CTA.label,
  primaryButtonHref = LANDING_FINAL_CTA.href,
  primaryButton,
}: {
  content: ProductPingLandingContent;
  /** `null`이면 섹션 id를 붙이지 않음 (소비자 랜딩 — `#start`는 URL 입력 섹션) */
  sectionId?: string | null;
  title?: string;
  titleLine2?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  primaryButton?: ReactNode;
}) {
  return (
    <ResponsiveHeroBanner
      className="landing-final-hero-banner"
      sectionId={sectionId}
      backgroundImageUrl={LANDING_FINAL_HERO_BACKGROUND}
      title={title}
      titleLine2={titleLine2}
      description={content.start.lead}
      primaryButtonText={primaryButtonText}
      primaryButtonHref={primaryButtonHref}
      primaryButton={primaryButton}
      trustItems={[]}
    />
  );
}
