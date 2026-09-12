import { LandingMagicSection } from "@/components/landing/LandingMagicSection";
import { ResearchFlowStages } from "@/components/landing/ResearchFlowStages";
import { TheShiftBody } from "@/components/landing/product-ping-sections";
import type { ProductPingLandingContent } from "@/content/seo/products-ping-types";
import {
  LANDING_RESEARCH_LEAD,
  LANDING_RESEARCH_TITLE,
  LANDING_SECTION_EYEBROWS,
  LANDING_TITLE_BREAKS,
} from "@/content/landing/landing-config";
import { pickShiftPlanningData } from "@/lib/landing/shift-planning-data";

/** 94% 스토리 아래 — 연구 시작 + 새 발송 흐름 + Before/After·데모 */
export function ResearchSection({ content }: { content: ProductPingLandingContent }) {
  const s = content.theShift;

  return (
    <LandingMagicSection
      id={s.anchorId}
      label={LANDING_SECTION_EYEBROWS.research}
      title={LANDING_RESEARCH_TITLE}
      titleBreakAfter={LANDING_TITLE_BREAKS.research}
      description={LANDING_RESEARCH_LEAD}
      tone="soft"
      className="landing-magic-section--research"
    >
      <ResearchFlowStages />
      <TheShiftBody shift={pickShiftPlanningData(content.theShift)} />
    </LandingMagicSection>
  );
}
