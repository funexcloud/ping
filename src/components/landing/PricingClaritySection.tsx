"use client";

import { Badge } from "@/components/ui/badge";
import { LandingDisplayTitle } from "@/components/landing/LandingDisplayTitle";
import { Marquee } from "@/components/ui/marquee";
import { LANDING_TITLE_BREAKS } from "@/content/landing/landing-config";
import { LANDING_PRICING_CLARITY } from "@/content/landing/pricing-clarity-config";

const { marquee, features, title, lead } = LANDING_PRICING_CLARITY;

const m1 = marquee.slice(0, 4);
const m2 = marquee.slice(4, 8);
const m3 = marquee.slice(8);

export type PricingClaritySectionProps = {
  label?: string;
  sectionId?: string;
};

/** 요금 Marquee 질문 + 4열 안내 — PRICING 라벨·`#pricing` 앵커 */
export function PricingClaritySection({
  label = "Pricing",
  sectionId = "pricing",
}: PricingClaritySectionProps) {
  return (
    <section
      id={sectionId}
      className="pricing-clarity-section"
      aria-labelledby="pricing-clarity-title"
    >
      <div className="ping-saas-shell">
        <div className="pricing-clarity-section__head">
          {label ? <p className="ping-saas-label">{label}</p> : null}
          <LandingDisplayTitle
            id="pricing-clarity-title"
            className="pricing-clarity-section__title"
            title={title}
            breakAfter={LANDING_TITLE_BREAKS.pricing}
          />
          <p className="pricing-clarity-section__lead">{lead}</p>

          <div className="pricing-clarity-section__marquee-wrap">
            <div className="pricing-clarity-section__marquee-fade pricing-clarity-section__marquee-fade--left" />
            <div className="pricing-clarity-section__marquee-fade pricing-clarity-section__marquee-fade--right" />

            <div className="pricing-clarity-section__marquee-rows">
              <Marquee className="[--duration:45s]" repeat={4}>
                {m1.map((q) => (
                  <Badge
                    key={q}
                    variant="outline"
                    className="rounded-none border-[var(--ping-tint-border)] bg-[var(--ping-tint-bg)] px-3 py-1 text-sm font-medium text-[var(--saas-sub)] shadow-none"
                  >
                    {q}
                  </Badge>
                ))}
              </Marquee>

              <Marquee className="[--duration:50s]" repeat={4} reverse>
                {m2.map((q) => (
                  <Badge
                    key={q}
                    variant="outline"
                    className="rounded-none border-[var(--ping-tint-border)] bg-[var(--ping-tint-bg)] px-3 py-1 text-sm font-medium text-[var(--saas-sub)] shadow-none"
                  >
                    {q}
                  </Badge>
                ))}
              </Marquee>

              <Marquee className="[--duration:42s]" repeat={4}>
                {m3.map((q) => (
                  <Badge
                    key={q}
                    variant="outline"
                    className="rounded-none border-[var(--ping-tint-border)] bg-[var(--ping-tint-bg)] px-3 py-1 text-sm font-medium text-[var(--saas-sub)] shadow-none"
                  >
                    {q}
                  </Badge>
                ))}
              </Marquee>
            </div>
          </div>
        </div>

        <div className="pricing-clarity-section__grid">
          {features.map((feature) => {
            const Icon = feature.Icon;
            return (
              <div key={feature.title} className="pricing-clarity-section__item">
                <Icon className="pricing-clarity-section__icon" aria-hidden strokeWidth={1.75} />
                <div className="pricing-clarity-section__item-body">
                  <h3 className="pricing-clarity-section__item-title">{feature.title}</h3>
                  <p className="pricing-clarity-section__item-desc">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
