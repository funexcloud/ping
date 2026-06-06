import {
  INTRO_DEMO_STEPS,
  INTRO_HEAD_PHRASES,
  INTRO_SEO,
} from "@/content/seo/intro-content";
import { PING_CONSOLE_APP_URL } from "@/lib/ping-main-path";
import Link from "next/link";

/**
 * /intro — 서버 HTML 본문 (SEO·GEO·소스 보기).
 * 인터랙티브 데모(IntroClient) 위에 시각적으로 숨기고 크롤러·스크린리더용 전체 문장을 제공합니다.
 */
export function IntroSeoBody() {
  return (
    <article className="sr-only" aria-label="PING 서비스 안내 요약">
      <h1>{INTRO_SEO.title}</h1>
      <p>{INTRO_SEO.lead}</p>
      <p>
        <strong>PING</strong> — {INTRO_SEO.tagline}
      </p>

      <h2>안내 메시지</h2>
      <ul>
        {INTRO_HEAD_PHRASES.map((phrase) => (
          <li key={phrase}>{phrase}</li>
        ))}
      </ul>

      <h2>발송·결제·완료 시나리오 ({INTRO_DEMO_STEPS.length}단계)</h2>
      <ol>
        {INTRO_DEMO_STEPS.map((step, i) => (
          <li key={step.name}>
            <strong>
              {i + 1}. {step.name}
            </strong>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>

      <h2>바로 시작하기</h2>
      <ul>
        {INTRO_SEO.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>

      <nav aria-label="관련 페이지">
        <ul>
          <li>
            <Link href={PING_CONSOLE_APP_URL}>PING 운영 콘솔 (도입하기)</Link>
          </li>
          <li>
            <Link href="/products/ping">서비스 소개 (/products/ping)</Link>
          </li>
          <li>
            <Link href="/pricing">이용 요금 (/pricing)</Link>
          </li>
          <li>
            <Link href="/customer-center">고객센터 (/customer-center)</Link>
          </li>
        </ul>
      </nav>
    </article>
  );
}
