import { OverviewHeroMock } from "@/app/overview/overview-hero-mock";
import { OverviewStickyHeader } from "@/app/overview/overview-sticky-header";
import {
  OVERVIEW_FEATURES,
  OVERVIEW_HERO,
  OVERVIEW_PRICING,
  OVERVIEW_STEPS,
  PING_OVERVIEW_FAQ,
} from "@/content/seo/overview-content";
import { PING_CONSOLE_APP_URL } from "@/lib/ping-main-path";
import { PING_PRODUCT_MARKETING_PATH } from "@/lib/ping-site-seo";
import { CircleCheck, LifeBuoy, Send, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

/** 마케팅 상세(`/products/ping`) — 서버 HTML 본문 (SEO·GEO·소스 보기) */
export function OverviewPageView() {
  return (
    <div className="ping-product-landing min-h-dvh font-ping antialiased">
      <OverviewStickyHeader>
        <header className="ping-landing-shell flex h-[76px] items-center justify-between gap-4">
          <Link
            href={PING_PRODUCT_MARKETING_PATH}
            className="inline-flex shrink-0 items-center gap-2.5 rounded-[10px]"
            aria-label="PING 홈"
          >
            <img
              src="/ping_logo_svg.svg"
              alt="PING"
              className="block h-auto w-[93.6px] bg-transparent"
            />
          </Link>
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <nav
              className="ping-landing-nav hidden flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:flex sm:max-w-none sm:gap-[22px]"
              aria-label="랜딩 네비게이션"
            >
              <a href="#features">기능</a>
              <a href="#how-it-works">사용 방법</a>
              <a href="#pricing">가격</a>
              <a href="#faq">FAQ</a>
              <Link href="/mypage">마이페이지</Link>
            </nav>
            <Link href={PING_CONSOLE_APP_URL} className="ping-landing-nav-cta shrink-0">
              도입하기
            </Link>
          </div>
        </header>
      </OverviewStickyHeader>

      <main>
        <section className="ping-landing-hero">
          <div className="ping-landing-shell ping-landing-hero-grid">
            <div>
              <p className="ping-landing-hero-kicker">
                <Sparkles aria-hidden />
                {OVERVIEW_HERO.eyebrow}
              </p>
              <h1>{OVERVIEW_HERO.title}</h1>
              <p className="ping-landing-hero-lead">{OVERVIEW_HERO.lead}</p>
              <div className="ping-landing-hero-actions">
                <Link href={PING_CONSOLE_APP_URL} className="ping-landing-btn-solid">
                  <Send className="size-4 shrink-0" aria-hidden />
                  도입하기
                </Link>
              </div>
              <ul className="ping-landing-hero-metrics">
                {OVERVIEW_HERO.highlights.map((h) => (
                  <li key={h}>
                    <CircleCheck aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
            <OverviewHeroMock />
          </div>
        </section>

        <section id="features" className="ping-landing-section">
          <div className="ping-landing-shell">
            <div className="ping-landing-section-head">
              <p className="ping-landing-section-kicker">Core Features</p>
              <h2>실무에 필요한 기능만 단단하게</h2>
              <p className="ping-landing-section-desc">
                UI는 간결하게, 처리 흐름은 명확하게. 입력 실수와 운영 혼선을 줄이는 데 집중했습니다.
              </p>
            </div>
            <div className="ping-landing-feature-grid">
              {OVERVIEW_FEATURES.map((f) => (
                <article key={f.title} className="ping-landing-feature-card">
                  <span className="ping-landing-feature-icon" aria-hidden>
                    <f.Icon strokeWidth={2.25} />
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="ping-landing-section ping-landing-section--soft">
          <div className="ping-landing-shell">
            <div className="ping-landing-section-head">
              <p className="ping-landing-section-kicker">How It Works</p>
              <h2>짧고 명확한 3단계</h2>
              <p className="ping-landing-section-desc">
                처음 사용자도 길을 잃지 않도록, 각 단계의 목적과 다음 행동이 분명하게 설계되어 있습니다.
              </p>
            </div>
            <ol className="ping-landing-step-grid">
              {OVERVIEW_STEPS.map((step, i) => (
                <li key={step.title}>
                  <article className="ping-landing-step-card">
                    <span className="ping-landing-step-no">{i + 1}</span>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="ping-landing-section">
          <div className="ping-landing-shell">
            <div className="ping-landing-section-head">
              <p className="ping-landing-section-kicker">Pricing</p>
              <h2>단일 요금제, 단순한 계산</h2>
              <p className="ping-landing-section-desc">
                운영 판단을 빠르게 하기 위해 복잡한 플랜을 제거하고 건당 요금 중심으로 정리했습니다.
                자세한 채널별 요금은{" "}
                <Link href="/pricing" className="ping-landing-inline-link">
                  요금 안내
                </Link>
                를 참고하세요.
              </p>
            </div>
            <article className="ping-landing-pricing-panel">
              <div>
                <h3>{OVERVIEW_PRICING.planName}</h3>
                <p className="mt-2 text-[15px] text-[var(--landing-sub)]">{OVERVIEW_PRICING.planDesc}</p>
                <p className="ping-landing-price">
                  {OVERVIEW_PRICING.pricePerUnit}
                  <span>/건</span>
                </p>
              </div>
              <div className="ping-landing-pricing-meta">
                <div>
                  <strong>기본 이용료</strong> {OVERVIEW_PRICING.baseFee}
                </div>
                <div>
                  <strong>요금 방식</strong> 건당 과금
                </div>
                <div>
                  <strong>유의 사항</strong> {OVERVIEW_PRICING.note}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="faq" className="ping-landing-section pb-20 md:pb-28">
          <div className="ping-landing-shell">
            <div className="ping-landing-section-head">
              <p className="ping-landing-section-kicker">FAQ</p>
              <h2>자주 묻는 질문</h2>
              <p className="ping-landing-section-desc">
                PG 심사와 실제 운영에서 자주 확인되는 질문을 중심으로 정리했습니다.
              </p>
            </div>
            <div className="ping-landing-faq-list">
              {PING_OVERVIEW_FAQ.map((item, i) => (
                <details key={item.question} className="ping-landing-faq-item" open={i === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
            <div className="ping-landing-cta-banner">
              <div>
                <h3 className="mb-2 text-lg font-extrabold">지금 바로 PING 흐름을 시작해 보세요.</h3>
                <p className="text-[15px] text-[var(--landing-sub)]">
                  링크 입력부터 결제까지, 한 화면 흐름으로 빠르게 진행할 수 있습니다.
                </p>
              </div>
              <div className="ping-landing-hero-actions !mt-0">
                <Link href={PING_CONSOLE_APP_URL} className="ping-landing-btn-soft">
                  <Zap className="size-4 shrink-0" aria-hidden />
                  도입하기
                </Link>
                <Link href="/customer-center" className="ping-landing-btn-soft">
                  <LifeBuoy className="size-4 shrink-0" aria-hidden />
                  고객센터
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="ping-landing-footer">
        <div className="ping-landing-shell flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="text-sm leading-relaxed text-[var(--landing-sub)]">
            <strong className="text-[var(--landing-text)]">한국AIBC융합원</strong>
            <br />
            부고 커뮤니케이션 서비스 PING
          </div>
          <nav
            className="flex flex-wrap gap-x-5 gap-y-2"
            aria-label="정책 링크"
          >
            <Link href="/legal/terms-of-service?pingReturn=products-ping">이용약관</Link>
            <Link href="/legal/privacy-policy?pingReturn=products-ping">개인정보처리방침</Link>
            <Link href="/legal/refund-policy?pingReturn=products-ping">취소 및 환불정책</Link>
            <Link href="/legal/service-payment-guide?pingReturn=products-ping">서비스/결제 안내</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
