import { HeroTrustMicrocopy, HeroUrlForm } from "@/components/landing/hero-url-form";
import { LANDING_HERO_PREVIEW } from "@/content/landing/landing-config";
import {
  ArrowDown,
  CircleCheck,
  Link2,
  Megaphone,
  Sparkles,
} from "lucide-react";

export function HeroSection() {
  return (
    <section className="ping-saas-hero" aria-labelledby="ping-saas-hero-title">
      <div className="ping-saas-hero__grid" aria-hidden />
      <div className="ping-saas-shell">
        <div className="ping-saas-hero__inner">
          <p className="ping-saas-announce">
            <Megaphone aria-hidden />
            현직 장례지도사가 만든 부고 서비스
          </p>

          <h1 id="ping-saas-hero-title">
            부고 링크만 붙여넣으면,
            <br />
            <span className="ping-saas-gradient-text">나머지는 핑이</span> 합니다
          </h1>

          <p className="ping-saas-hero-lead">
            고인 정보·빈소·발인을 자동으로 채우고,
            <br className="hidden sm:block" />
            유효한 번호에만 부고를 보냅니다.
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
