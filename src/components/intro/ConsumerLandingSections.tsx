import { ConsumerConversionHero } from "@/components/intro/ConsumerConversionHero";
import { IntroJourneySteps } from "@/components/intro/IntroJourneySteps";
import { OldWaySection } from "@/components/landing/product-ping-sections";
import { ResearchBuildFlowSection } from "@/components/landing/ResearchBuildFlowSection";
import { ResearchSection } from "@/components/landing/ResearchSection";
import { StorySection } from "@/components/landing/StorySection";
import { LandingMagicSection } from "@/components/landing/LandingMagicSection";
import type { ProductPingLandingContent } from "@/content/seo/products-ping-types";
import { MAGIC_SECTIONS } from "@/lib/intro/config";
import "@/app/intro/intro.css";
import "@/components/intro/intro-pipeline.css";
import "@/components/intro/phone-flow.css";
import "@/components/landing/landing-magic-section.css";

/** 소비자 홈(`/`) — Magic UI 섹션, 목업·GSAP 없음 */
export function ConsumerLandingSections({ content }: { content: ProductPingLandingContent }) {
  const journey = MAGIC_SECTIONS.journey;

  return (
    <div className="intro-pipeline intro-pipeline--magic intro-pipeline--static">
      <ConsumerConversionHero />

      <LandingMagicSection
        id={journey.id}
        label={journey.label}
        title={journey.title}
        description={journey.lead}
        tone="default"
        className="landing-magic-section--journey"
      >
        <IntroJourneySteps />
      </LandingMagicSection>

      <OldWaySection content={content} />

      <StorySection />

      <ResearchSection content={content} />

      <ResearchBuildFlowSection />
    </div>
  );
}
