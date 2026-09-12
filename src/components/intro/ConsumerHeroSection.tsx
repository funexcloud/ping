import { LANDING_SECTION_EYEBROWS } from "@/content/landing/landing-config";
import { LandingDisplayTitle } from "@/components/landing/LandingDisplayTitle";
import { HERO } from "@/lib/intro/config";

/** 옛 방식 히어로 다음 — 전환 카피 (목업은 같은 섹션의 HeroPhoneStepsSection) */
export function ConsumerHeroSection() {
  const title = `${HERO.h1[0]} ${HERO.h1[1]}`;

  return (
    <div className="intro-hero intro-hero--magic intro-hero--fan ping-saas-hero">
      <div className="intro-hero__inner ping-saas-hero__inner">
        <p className="ping-saas-label">{LANDING_SECTION_EYEBROWS.hero}</p>
        <LandingDisplayTitle
          id="intro-hero-title"
          className="intro-hero__title"
          title={title}
          breakAfter={HERO.h1[0]}
          accentRest
        />

        <p className="intro-hero__sub">{HERO.sub}</p>
      </div>
    </div>
  );
}
