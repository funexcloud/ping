import { PRODUCTS_PING_CONSUMER } from "@/content/seo/products-ping-content";
import Link from "next/link";

/** `/` · B2B `/products/ping/business` — 서버 HTML 본문 (SEO·GEO) */
export function ProductsPingSeoBody() {
  const c = PRODUCTS_PING_CONSUMER;
  return (
    <article className="sr-only" aria-label="PING 부고 대량발송 서비스 소개">
      <h1>
        {c.hero.title} — {c.hero.titleAccent}
      </h1>
      <p>{c.hero.lead}</p>

      <h2>{c.oldWay.title}</h2>
      <p>{c.oldWay.description}</p>
      <ul>
        {c.oldWay.pains.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <h2>{c.theShift.title}</h2>
      <p>{c.theShift.description}</p>

      <h2>{c.trust.title}</h2>
      <ul>
        {c.trust.items.map((item) => (
          <li key={item.title}>
            {item.title}: {item.desc}
          </li>
        ))}
      </ul>

      <h2>{c.vertical.title}</h2>
      <ol>
        {c.vertical.steps.map((step) => (
          <li key={step.title}>
            {step.title} — {step.desc}
          </li>
        ))}
      </ol>

      <h2>{c.howItWorks.title}</h2>
      <ol>
        {c.howItWorks.steps.map((step) => (
          <li key={step.title}>
            {step.title}: {step.desc}
          </li>
        ))}
      </ol>

      <nav aria-label="관련 페이지">
        <ul>
          <li>
            <Link href="/">개인 이용 홈</Link>
          </li>
          <li>
            <Link href="/start">부고 발송 시작 (/start)</Link>
          </li>
          <li>
            <Link href="/pricing">요금 안내 (/pricing)</Link>
          </li>
          <li>
            <Link href="/condolence">디지털 방명록 · 부의금 정리</Link>
          </li>
          <li>
            <Link href="/products/ping/business">장례업체 소개</Link>
          </li>
        </ul>
      </nav>
    </article>
  );
}
