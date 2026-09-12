import { HeroScrollButton } from "@/components/intro/HeroScrollButton";
import { LandingDisplayTitle } from "@/components/landing/LandingDisplayTitle";
import { OldWayFlowSkeleton } from "@/components/landing/OldWayFlowSkeleton";
import { TheShiftBodyClient } from "@/components/landing/TheShiftBodyClient";
import type { ProductPingLandingContent } from "@/content/seo/products-ping-types";
import { LANDING_TRUST_QUOTES, MAGIC_SECTIONS } from "@/lib/intro/config";
import { pickShiftPlanningData } from "@/lib/landing/shift-planning-data";
import { HeroTrustMicrocopy, HeroUrlForm } from "@/components/landing/hero-url-form";
import { LANDING_HERO_PREVIEW, LANDING_SECTION_EYEBROWS, LANDING_TITLE_BREAKS } from "@/content/landing/landing-config";
import {
  ArrowDown,
  CircleCheck,
  Clock,
  Link2,
  Megaphone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { PingMarketingCtaRow } from "@/components/marketing-responsive";

function SectionHead({
  label,
  title,
  description,
  titleAs: TitleTag = "h2",
  titleId,
}: {
  label?: string;
  title: string;
  description?: string;
  titleAs?: "h1" | "h2";
  titleId?: string;
}) {
  return (
    <div className="ping-saas-section-head">
      {label ? <p className="ping-saas-label">{label}</p> : null}
      <TitleTag id={titleId}>{title}</TitleTag>
      {description ? <p className="ping-saas-section-desc">{description}</p> : null}
    </div>
  );
}

export function ProductPingHeroSection({ content }: { content: ProductPingLandingContent }) {
  const { hero } = content;
  return (
    <section id="hero" className="ping-saas-hero" aria-labelledby="ping-saas-hero-title">
      <div className="ping-saas-hero__grid" aria-hidden />
      <div className="ping-saas-shell">
        <div className="ping-saas-hero__inner">
          <p className="ping-saas-announce">
            <Megaphone aria-hidden />
            {hero.eyebrow}
          </p>

          <h1 id="ping-saas-hero-title">
            {hero.title}
            <br />
            <span className="ping-saas-gradient-text">{hero.titleAccent}</span>
          </h1>

          <p className="ping-saas-hero-lead">{hero.lead}</p>

          <p className="ping-saas-hero-badge">
            <Clock aria-hidden />
            {hero.badge}
          </p>

          <div className="ping-saas-onboard">
            <HeroUrlForm />
            <HeroTrustMicrocopy />
          </div>

          <HeroPreviewCard />
        </div>
      </div>
    </section>
  );
}

function HeroPreviewCard() {
  return (
    <div className="ping-saas-preview-wrap">
      <div className="ping-saas-preview-frame" aria-label="부고 URL 자동완성 미리보기">
        <div className="ping-saas-preview-chrome" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="ping-saas-preview-body">
          <p className="ping-saas-preview-hint">
            <Sparkles aria-hidden />
            붙여넣으면 이렇게 자동완성됩니다
          </p>
          <div className="ping-saas-preview-url">
            <Link2 aria-hidden />
            <span>{LANDING_HERO_PREVIEW.sampleUrl}</span>
          </div>
          <div className="ping-saas-preview-arrow" aria-hidden>
            <ArrowDown />
          </div>
          <div className="ping-saas-preview-card">
            <dl>
              {LANDING_HERO_PREVIEW.rows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="ping-saas-preview-foot">
            <CircleCheck aria-hidden />
            부고 본문 초안까지 자동 생성
          </p>
        </div>
      </div>
    </div>
  );
}

export function OldWaySection({
  content,
  asHero = false,
}: {
  content: ProductPingLandingContent;
  asHero?: boolean;
}) {
  const s = content.oldWay;
  return (
    <section
      id={s.anchorId}
      className={`ping-saas-section ping-saas-section--soft ping-landing-motion__section${asHero ? " ping-saas-section--hero-old-way" : ""}`}
      aria-labelledby="old-way-title"
    >
      <div className="ping-saas-shell">
        {asHero ? (
          <div className="ping-saas-section-head">
            <p className="ping-saas-label">{LANDING_SECTION_EYEBROWS.oldWay}</p>
            <LandingDisplayTitle
              as="h1"
              id="old-way-title"
              title={s.title}
              breakAfter={LANDING_TITLE_BREAKS.oldWay}
            />
            {s.description ? <p className="ping-saas-section-desc">{s.description}</p> : null}
          </div>
        ) : (
          <SectionHead title={s.title} description={s.description} titleId="old-way-title" />
        )}
        <OldWayFlowSkeleton />
        {asHero ? <HeroScrollButton targetId={MAGIC_SECTIONS.hero.id} /> : null}
      </div>
    </section>
  );
}

export function TheShiftBody({ shift }: { shift: ReturnType<typeof pickShiftPlanningData> }) {
  return <TheShiftBodyClient shift={shift} />;
}

export function TheShiftSection({ content }: { content: ProductPingLandingContent }) {
  const s = content.theShift;
  return (
    <section id={s.anchorId} className="ping-saas-section ping-landing-motion__section">
      <div className="ping-saas-shell">
        <SectionHead label={s.sectionLabel} title={s.title} description={s.description} />
        <TheShiftBody shift={pickShiftPlanningData(s)} />
      </div>
    </section>
  );
}

export function ProductPingTrustQuotesSection({ embedded = false }: { embedded?: boolean }) {
  const quotes = (
    <ul className="ping-saas-trust-quotes">
      {LANDING_TRUST_QUOTES.map((item) => (
        <li key={item.quote}>
          <blockquote className="ping-saas-trust-quote ping-bordered-panel">
            <p>{item.quote}</p>
            <footer>
              <cite>{item.role}</cite>
              <span>{item.org}</span>
            </footer>
          </blockquote>
        </li>
      ))}
    </ul>
  );

  if (embedded) return quotes;

  return (
    <section
      id="trust-quotes"
      className="ping-saas-section ping-saas-section--soft ping-landing-motion__section"
      aria-labelledby="trust-quotes-title"
    >
      <div className="ping-saas-shell ping-saas-shell--narrow">
        <div className="ping-saas-section-head">
          <p className="ping-saas-label">신뢰</p>
          <h2 id="trust-quotes-title">현장에서 전해주는 말</h2>
        </div>
        {quotes}
      </div>
    </section>
  );
}

export function TrustSection({ content }: { content: ProductPingLandingContent }) {
  const s = content.trust;
  return (
    <section id={s.anchorId} className="ping-saas-section ping-saas-section--soft ping-landing-motion__section">
      <div className="ping-saas-shell">
        <SectionHead label={s.sectionLabel} title={s.title} description={s.description} />
        <div className="ping-saas-trust-grid">
          {s.items.map((item) => (
            <article key={item.title} className="ping-saas-trust-card ping-bordered-panel">
              <span className="ping-saas-feature-icon" aria-hidden>
                <item.Icon strokeWidth={2.25} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VerticalFlowSection({ content }: { content: ProductPingLandingContent }) {
  const s = content.vertical;
  return (
    <section id={s.anchorId} className="ping-saas-section ping-landing-motion__section">
      <div className="ping-saas-shell">
        <SectionHead label={s.sectionLabel} title={s.title} description={s.description} />
        <ol className="ping-saas-vertical-flow">
          {s.steps.map((step, i) => (
            <li key={step.title}>
              <article className="ping-saas-vertical-step">
                <span className="ping-saas-step-no">{i + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                  {step.href ? (
                    <Link href={step.href} className="ping-saas-inline-link">
                      자세히 보기
                    </Link>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ProductPingPricingSection({
  content,
  embedded = false,
}: {
  content: ProductPingLandingContent;
  embedded?: boolean;
}) {
  const s = content.pricing;
  const panel = (
    <article className="ping-saas-pricing-panel">
      <div>
        <h3>{s.planName}</h3>
        <p className="ping-saas-pricing-desc">{s.planDesc}</p>
        <p className="ping-saas-pricing-base">
          요금 방식 <strong>{s.unitPrice}</strong>
        </p>
      </div>
      <div className="ping-saas-pricing-meta">
        <p className="ping-saas-pricing-base">
          기본 이용료 <strong>{s.baseFee}</strong>
        </p>
        <div>
          <strong>안내</strong> {s.note}
        </div>
      </div>
    </article>
  );

  if (embedded) return panel;

  return (
    <section id={s.anchorId} className="ping-saas-section ping-saas-section--soft ping-landing-motion__section">
      <div className="ping-saas-shell">
        <SectionHead label={s.sectionLabel} title={s.title} description={s.description} />
        {panel}
      </div>
    </section>
  );
}

export function ProductPingHowItWorksSection({ content }: { content: ProductPingLandingContent }) {
  const s = content.howItWorks;
  return (
    <section id={s.anchorId} className="ping-saas-section ping-landing-motion__section">
      <div className="ping-saas-shell">
        <SectionHead label={s.sectionLabel} title={s.title} description={s.description} />
        <ol className="ping-saas-step-grid">
          {s.steps.map((step, i) => (
            <li key={step.title}>
              <article className="ping-saas-step-card">
                <span className="ping-saas-step-no">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ProductPingFaqSection({
  content,
  embedded = false,
}: {
  content: ProductPingLandingContent;
  embedded?: boolean;
}) {
  const s = content.faq;
  const list = (
    <div className="ping-saas-faq-list">
      {s.items.map((item, i) => (
        <details key={item.question} className="ping-saas-faq-item" open={i === 0}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );

  if (embedded) return list;

  return (
    <section id={s.anchorId} className="ping-saas-section pb-12 md:pb-16 ping-landing-motion__section">
      <div className="ping-saas-shell">
        <SectionHead label={s.sectionLabel} title={s.title} description={s.description} />
        {list}
      </div>
    </section>
  );
}

export function ProductPingStartSection({
  content,
  audience,
  embedded = false,
}: {
  content: ProductPingLandingContent;
  audience: ProductPingLandingContent["audience"];
  embedded?: boolean;
}) {
  const s = content.start;
  const body = (
    <div className="ping-saas-final-cta">
      {!embedded ? <SectionHead label={s.sectionLabel} title={s.title} description={s.lead} /> : null}
      {audience === "consumer" ? (
        <div className="ping-saas-onboard ping-saas-onboard--center">
          <HeroUrlForm />
          <HeroTrustMicrocopy />
        </div>
      ) : (
        <PingMarketingCtaRow />
      )}
      {audience === "business" ? (
        <p className="ping-saas-section-desc mt-4 text-center">
          <Link href="/partnership" className="ping-saas-inline-link">
            제휴 문의하기
          </Link>
        </p>
      ) : null}
    </div>
  );

  if (embedded) return body;

  return (
    <section id={s.anchorId} className="ping-saas-section pb-20 md:pb-28 ping-landing-motion__section">
      <div className="ping-saas-shell ping-saas-shell--narrow">
        {body}
      </div>
    </section>
  );
}
