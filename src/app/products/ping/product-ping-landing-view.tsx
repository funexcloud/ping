import { FeaturesSpecialTextBanner } from "@/components/intro/FeaturesSpecialTextBanner";
import { LandingTestimonialsPanel } from "@/components/landing/LandingTestimonialsPanel";
import {
  OldWaySection,
  ProductPingFaqSection,
  ProductPingHeroSection,
  ProductPingHowItWorksSection,
  ProductPingPricingSection,
  ProductPingStartSection,
  TheShiftSection,
  TrustSection,
  VerticalFlowSection,
} from "@/components/landing/product-ping-sections";
import { LandingMagicSection } from "@/components/landing/LandingMagicSection";
import { LandingFinalHeroBanner } from "@/components/landing/LandingFinalHeroBanner";
import { StartOnboardMemberWelcome } from "@/components/landing/StartOnboardMemberWelcome";
import { PricingClaritySection } from "@/components/landing/PricingClaritySection";
import { LandingSectionMotion } from "@/components/landing/LandingSectionMotion";
import { ConsumerLandingSections } from "@/components/intro/ConsumerLandingSections";
import "@/components/landing/landing-magic-section.css";
import "@/components/landing/landing-section-motion.css";
import { PingMarketingShell } from "@/components/marketing-responsive";
import {
  getProductPingContent,
  PRODUCTS_PING_ENTERPRISE,
} from "@/content/seo/products-ping-business-content";
import type { ProductPingAudience } from "@/content/seo/products-ping-types";
import { LANDING_SECTION_EYEBROWS, LANDING_TITLE_BREAKS } from "@/content/landing/landing-config";
import { MAGIC_SECTIONS } from "@/lib/intro/config";
import {
  PING_CONSUMER_HOME_PATH,
  PING_PRODUCT_BUSINESS_PATH,
} from "@/lib/ping-site-seo";

function EnterpriseSection() {
  const s = PRODUCTS_PING_ENTERPRISE;
  return (
    <section id={s.anchorId} className="ping-saas-section ping-landing-motion__section">
      <div className="ping-saas-shell">
        <div className="ping-saas-section-head">
          <p className="ping-saas-label">{s.sectionLabel}</p>
          <h2>{s.title}</h2>
          <p className="ping-saas-section-desc">{s.description}</p>
        </div>
        <div className="ping-saas-trust-grid">
          {s.bullets.map((b) => (
            <article key={b.title} className="ping-saas-trust-card ping-bordered-panel">
              <span className="ping-saas-feature-icon" aria-hidden>
                <b.Icon strokeWidth={2.25} />
              </span>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConsumerMagicTailSections({
  content,
}: {
  content: ReturnType<typeof getProductPingContent>;
}) {
  const testimonials = MAGIC_SECTIONS.testimonials;
  const pricing = MAGIC_SECTIONS.pricing;
  const faq = MAGIC_SECTIONS.faq;

  return (
    <>
      <PricingClaritySection label={pricing.label} sectionId={pricing.id} />

      <LandingMagicSection
        id="pricing-rates"
        label={LANDING_SECTION_EYEBROWS.rates}
        title={pricing.title}
        titleBreakAfter={LANDING_TITLE_BREAKS.rates}
        description={content.pricing.description}
        tone="default"
        className="landing-magic-section--embedded-pricing"
      >
        <ProductPingPricingSection content={content} embedded />
      </LandingMagicSection>

      <LandingMagicSection
        id={faq.id}
        label={faq.label}
        title={faq.title}
        tone="default"
        className="landing-magic-section--embedded-faq"
      >
        <ProductPingFaqSection content={content} embedded />
      </LandingMagicSection>

      <LandingMagicSection
        id={testimonials.id}
        label={testimonials.label}
        title={testimonials.title}
        titleBreakAfter={LANDING_TITLE_BREAKS.testimonials}
        description={testimonials.lead}
        tone="default"
        className="landing-magic-section--embedded-trust landing-magic-section--embedded-start"
      >
        <LandingTestimonialsPanel />
      </LandingMagicSection>

      <LandingMagicSection
        id="start-onboard"
        hideHead
        tone="default"
        className="landing-magic-section--embedded-start landing-magic-section--start-onboard"
      >
        <StartOnboardMemberWelcome />
      </LandingMagicSection>

      <FeaturesSpecialTextBanner />

      <LandingFinalHeroBanner content={content} />
    </>
  );
}

export function ProductPingLandingView({ audience }: { audience: ProductPingAudience }) {
  const content = getProductPingContent(audience);
  const activePath = audience === "business" ? PING_PRODUCT_BUSINESS_PATH : PING_CONSUMER_HOME_PATH;
  const homeHref = audience === "business" ? PING_PRODUCT_BUSINESS_PATH : PING_CONSUMER_HOME_PATH;
  const isConsumer = audience === "consumer";

  const startSection = (
    <LandingSectionMotion>
      <ProductPingStartSection content={content} audience={audience} />
    </LandingSectionMotion>
  );

  return (
    <PingMarketingShell
      variant="landing"
      headerMode="b2c"
      activePath={activePath}
      homeHref={homeHref}
      className={`ping-product-landing ping-saas-landing font-ping antialiased${isConsumer ? " ping-magic-landing" : ""}`}
      belowMain={isConsumer ? undefined : startSection}
    >
      {isConsumer ? (
        <>
          <ConsumerLandingSections content={content} />
          <ConsumerMagicTailSections content={content} />
        </>
      ) : (
        <>
          <ProductPingHeroSection content={content} />
          <OldWaySection content={content} />
          <TheShiftSection content={content} />
        </>
      )}
      {!isConsumer ? (
        <LandingSectionMotion>
          <TrustSection content={content} />
          <ProductPingPricingSection content={content} />
          <VerticalFlowSection content={content} />
          <ProductPingHowItWorksSection content={content} />
          <EnterpriseSection />
          <ProductPingFaqSection content={content} />
        </LandingSectionMotion>
      ) : null}
    </PingMarketingShell>
  );
}
