import Link from "next/link";
import { WebPageJsonLd } from "@/components/seo/site-json-ld";
import { buildPublicMetadata } from "@/lib/ping-site-seo";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const metadata = buildPublicMetadata({
  title: "기술블로그 - PING",
  description:
    "PING 서비스 기술 스택(Next.js, Firebase, 토스페이먼츠)·시스템 아키텍처·오픈소스 라이선스 안내",
  path: "/tech-blog",
  keywords: ["PING 기술", "부고 발송 아키텍처"],
});

const TECH_SUPPORT_EMAIL = "kaibcmac@gmail.com";

type TechItem = { category: string; name: string; description: string };

const TECH_STACK: TechItem[] = [
  {
    category: "Frontend",
    name: "HTML5 / CSS3",
    description: "시맨틱 마크업과 모던 CSS를 활용한 반응형 웹 디자인",
  },
  {
    category: "Frontend",
    name: "JavaScript (ES6+)",
    description: "모던 JavaScript를 활용한 동적 사용자 인터페이스",
  },
  {
    category: "Frontend",
    name: "Tailwind CSS",
    description: "유틸리티 기반 CSS 프레임워크로 빠른 스타일링",
  },
  {
    category: "Frontend",
    name: "SheetJS",
    description: "엑셀 및 CSV 파일 자동 분석 및 처리",
  },
  {
    category: "Backend",
    name: "Firebase Cloud Functions",
    description: "Node.js 18 기반 서버리스 백엔드",
  },
  {
    category: "Backend",
    name: "PHP",
    description: "대안 백엔드 옵션으로 제공되는 PHP 서버",
  },
  {
    category: "Database",
    name: "Firebase Firestore",
    description: "NoSQL 실시간 데이터베이스",
  },
  {
    category: "Storage",
    name: "Firebase Storage",
    description: "클라우드 파일 저장소",
  },
  {
    category: "Payment",
    name: "Toss Payments",
    description: "안전한 결제 처리 시스템",
  },
  {
    category: "Font",
    name: "Pretendard",
    description: "한글 최적화 웹폰트",
  },
  {
    category: "Icon",
    name: "Font Awesome",
    description: "벡터 아이콘 라이브러리",
  },
];

const MAIN_LIBS: string[] = [
  "Firebase SDK (v9) - Firebase 서비스 통합",
  "Toss Payments SDK - 결제 처리",
  "SheetJS (XLSX) - 엑셀 파일 파싱",
  "Axios - HTTP 클라이언트",
  "Firebase Admin SDK - 서버 사이드 Firebase 관리",
];

const ARCHITECTURE: string[] = [
  "프론트엔드 - 정적 HTML/CSS/JavaScript로 구성된 반응형 웹 애플리케이션",
  "백엔드 - Firebase Cloud Functions 또는 PHP를 통한 서버 사이드 처리",
  "데이터베이스 - Firestore를 통한 실시간 데이터 저장 및 조회",
  "파일 저장소 - Firebase Storage를 통한 파일 업로드 및 관리",
  "결제 시스템 - Toss Payments를 통한 안전한 결제 처리",
];

const THIRD_PARTY_LICENSES: string[] = [
  "Firebase SDK - Apache License 2.0",
  "Toss Payments SDK - Toss Payments 이용약관",
  "SheetJS - Apache License 2.0",
  "Tailwind CSS - MIT License",
  "Font Awesome - Font Awesome Free License (Icons: CC BY 4.0, Fonts: SIL OFL 1.1)",
  "Pretendard - SIL Open Font License 1.1",
];

const USAGE_RULES: string[] = [
  "서비스의 무단 복제, 배포, 수정 금지",
  "상업적 목적의 무단 사용 금지",
  "서비스의 안정성과 보안을 해치는 행위 금지",
  "타인의 지적재산권을 침해하는 행위 금지",
];

export default function TechBlogPage() {
  return (
    <>
      <WebPageJsonLd
        path="/tech-blog"
        title="PING 기술 스택"
        description="Next.js·Firebase·결제 연동 기반 부고 대량발송 서비스 아키텍처"
      />
      <div className="min-h-dvh bg-[#f9fafb] font-ping text-[#191f28] antialiased">
      <header className="sticky top-0 z-20 border-b border-[#e5e8eb] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[900px] items-center justify-between px-6">
          <Link href="/products/ping" className="inline-flex items-center gap-2" aria-label="PING 홈">
            <img src="/ping_logo_svg.svg" alt="PING" className="h-7 w-auto" />
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold text-[#6b7684]">
            <Link href="/products/ping" className="hover:text-[var(--ping-primary)]">
              서비스 소개
            </Link>
            <Link href="/customer-center" className="hover:text-[var(--ping-primary)]">
              고객센터
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-6 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-[900px]">
          <span className="mb-6 inline-block rounded-full bg-[rgba(49,130,246,0.12)] px-4 py-2 text-sm font-semibold text-[var(--ping-primary)]">
            기술블로그
          </span>
          <h1 className="mb-4 text-[2rem] font-extrabold tracking-tight text-[#191f28] sm:text-5xl">
            PING의 기술 스택
          </h1>
          <p className="mx-auto max-w-[600px] text-base leading-relaxed text-[#6b7684] sm:text-lg">
            안정적이고 확장 가능한 기술로 구축된 PING 서비스를 소개합니다.
          </p>
        </div>
      </section>

      <section className="bg-white px-6 pb-20">
        <div className="mx-auto max-w-[900px] space-y-8">
          <article className="rounded-3xl border border-[#e5e8eb] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] sm:p-12">
            <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-[#191f28] sm:text-[32px]">
              기술 스택
            </h2>
            <p className="mb-8 text-base leading-relaxed text-[#6b7684]">
              PING은 최신 웹 기술과 클라우드 서비스를 활용하여 안정적이고 확장 가능한 서비스를 제공합니다.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {TECH_STACK.map((t) => (
                <div
                  key={`${t.category}-${t.name}`}
                  className="rounded-2xl border border-[#e5e8eb] bg-[#f9fafb] p-6 transition hover:-translate-y-0.5 hover:border-[var(--ping-primary)] hover:shadow-[0_8px_24px_rgba(49,130,246,0.1)]"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ping-primary)]">
                    {t.category}
                  </p>
                  <h3 className="mb-2 text-xl font-bold text-[#191f28]">{t.name}</h3>
                  <p className="text-sm leading-relaxed text-[#6b7684]">{t.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-[#e5e8eb] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] sm:p-12">
            <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-[#191f28] sm:text-[32px]">
              주요 라이브러리 및 SDK
            </h2>
            <TechBulletList items={MAIN_LIBS} />
          </article>

          <article className="rounded-3xl border border-[#e5e8eb] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] sm:p-12">
            <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-[#191f28] sm:text-[32px]">
              시스템 아키텍처
            </h2>
            <p className="mb-8 text-base leading-relaxed text-[#6b7684]">
              PING은 클라이언트-서버 아키텍처를 기반으로 하며, Firebase를 중심으로 한 서버리스 구조를 채택하고 있습니다.
            </p>
            <TechBulletList items={ARCHITECTURE} />
          </article>

          <article className="rounded-3xl border border-[#e5e8eb] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] sm:p-12">
            <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-[#191f28] sm:text-[32px]">
              저작권 및 라이선스
            </h2>

            <CopyrightBlock title="PING 서비스 저작권">
              <p>
                <strong className="text-[#191f28]">© 2024 PING. All rights reserved.</strong>
              </p>
              <p>
                PING 서비스 및 관련 모든 콘텐츠(텍스트, 이미지, 로고, 디자인 등)는 한국AIBC융합원의 저작권으로 보호받습니다.
              </p>
              <p>
                본 서비스의 소스 코드, 디자인, 기능 등을 무단으로 복제, 배포, 수정, 전송하는 행위는 저작권법에 위배될 수 있습니다.
              </p>
            </CopyrightBlock>

            <CopyrightBlock title="제3자 라이브러리 라이선스" className="mt-6">
              <p>
                PING은 다음과 같은 오픈소스 라이브러리를 사용하고 있으며, 각 라이브러리는 해당 라이선스에 따라 제공됩니다:
              </p>
              <TechBulletList items={THIRD_PARTY_LICENSES} className="mt-4" />
            </CopyrightBlock>

            <CopyrightBlock title="이용 약관" className="mt-6">
              <p>PING 서비스를 이용하시는 경우, 다음 사항을 준수해야 합니다:</p>
              <TechBulletList items={USAGE_RULES} className="mt-4" />
              <p className="mt-4">
                저작권 관련 문의사항이 있으시면{" "}
                <a
                  href={`mailto:${TECH_SUPPORT_EMAIL}`}
                  className="font-semibold text-[var(--ping-primary)] no-underline hover:underline"
                >
                  {TECH_SUPPORT_EMAIL}
                </a>
                으로 연락주시기 바랍니다.
              </p>
            </CopyrightBlock>
          </article>
        </div>
      </section>

      <footer className="border-t border-[#e5e8eb] bg-[#191f28] px-6 py-12 text-white">
        <div className="mx-auto flex max-w-[900px] flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="text-sm leading-relaxed text-[#b0b8c1]">
            <strong className="text-white">한국AIBC융합원</strong>
            <br />
            부고 커뮤니케이션 서비스 PING
          </div>
          <nav
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#b0b8c1]"
            aria-label="정책 링크"
          >
            <a href="/legal/terms-of-service" className="hover:text-white">
              이용약관
            </a>
            <a href="/legal/privacy-policy" className="hover:text-white">
              개인정보처리방침
            </a>
            <a href="/legal/refund-policy" className="hover:text-white">
              취소 및 환불정책
            </a>
            <a href="/legal/service-payment-guide" className="hover:text-white">
              서비스/결제 안내
            </a>
          </nav>
        </div>
      </footer>
    </div>
    </>
  );
}

function TechBulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("list-none space-y-0", className)}>
      {items.map((line) => {
        const [boldPart, ...restParts] = line.split(" - ");
        const rest = restParts.length ? ` - ${restParts.join(" - ")}` : "";
        return (
          <li
            key={line}
            className="flex items-start gap-3 border-b border-[#e5e8eb] py-3 last:border-b-0"
          >
            <span className="mt-0.5 shrink-0 font-bold text-[var(--ping-primary)]" aria-hidden>
              ▸
            </span>
            <span className="text-[15px] leading-relaxed text-[#333d4b]">
              {rest ? (
                <>
                  <strong className="text-[#191f28]">{boldPart}</strong>
                  {rest}
                </>
              ) : (
                line
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CopyrightBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-[#f9fafb] p-8", className)}>
      <h3 className="mb-4 text-xl font-bold text-[#191f28]">{title}</h3>
      <div className="space-y-3 text-sm leading-relaxed text-[#6b7684] [&_strong]:text-[#191f28] [&_strong]:font-semibold">
        {children}
      </div>
    </div>
  );
}
