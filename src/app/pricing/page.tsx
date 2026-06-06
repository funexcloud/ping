import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { WebPageJsonLd } from "@/components/seo/site-json-ld";
import { ArrowRight, Check, Image as ImageIcon, Mail, MessageCircle, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buildPublicMetadata, PING_SITE_URL } from "@/lib/ping-site-seo";
import { cn } from "@/lib/utils";

export const metadata = buildPublicMetadata({
  title: "이용 요금 안내 | 핑(Ping)",
  description:
    "카카오 알림톡·단문(SMS)·장문(LMS)·사진(MMS) 부고 대량 발송 건당 요금. 사용한 만큼만 결제하는 PING 요금표.",
  path: "/pricing",
  keywords: ["부고 문자 요금", "알림톡 건당 가격", "SMS 발송 비용"],
});

type FeatureLine = { text: string; strong?: boolean };

export default function PricingPage() {
  return (
    <>
      <WebPageJsonLd
        path="/pricing"
        title="PING 이용 요금"
        description="알림톡·SMS·LMS·MMS 건당 요금 안내"
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "PING 이용 요금",
          url: `${PING_SITE_URL}/pricing`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "카카오 알림톡", description: "건당 15원" },
              { "@type": "ListItem", position: 2, name: "단문 SMS", description: "건당 20원" },
              { "@type": "ListItem", position: 3, name: "장문 LMS", description: "건당 45원" },
              { "@type": "ListItem", position: 4, name: "사진 MMS", description: "건당 100원" },
            ],
          },
        }}
      />
      <div className="min-h-dvh bg-[#0a192f] font-ping text-[#e6f1ff] antialiased">
        <header className="sticky top-0 z-[100] flex items-center justify-between border-b border-white/[0.05] bg-[#0a192f]/85 px-5 py-4 backdrop-blur-[10px] md:px-12 md:py-6">
          <Link href="/" className="text-2xl font-extrabold tracking-[-0.5px] text-[#e6f1ff] no-underline">
            Ping<span className="text-[#64ffda]">.</span>
          </Link>
          <nav>
            <Link
              href="/start"
              className="text-[0.95rem] font-medium text-[#8892b0] no-underline transition hover:text-[#64ffda]"
            >
              시작하기
            </Link>
          </nav>
        </header>

        <section className="px-5 py-16 text-center md:pb-[60px] md:pt-[100px]">
          <h1 className="mb-4 bg-gradient-to-br from-[#e6f1ff] to-[#8892b0] bg-clip-text text-[2.2rem] font-bold leading-tight tracking-tight text-transparent md:text-5xl">
            합리적인 대량 발송 요금
          </h1>
          <p className="mx-auto max-w-[600px] text-[1.05rem] leading-relaxed text-[#8892b0] md:text-[1.15rem]">
            복잡한 선불 충전 패키지 없이, 사용한 만큼만 깔끔하게 결제하세요.
            <br />
            부고장 생성 및 발송 관리에 최적화된 시스템을 제공합니다.
          </p>
        </section>

        <div className="mx-auto mb-24 grid max-w-[1000px] grid-cols-1 gap-6 px-5 md:grid-cols-2 lg:grid-cols-4">
          <PriceCard
            icon={MessageCircle}
            title="카카오 알림톡"
            price="15"
            desc="카카오톡 사용자에게 보내는 가장 확실하고 빠른 알림"
            features={[
              { text: "공식 인증 마크 표기" },
              { text: "높은 도달률 및 오픈율" },
              { text: "부고 전용 템플릿 기본 제공" },
            ]}
          />
          <PriceCard
            icon={Smartphone}
            title="단문 문자 (SMS)"
            price="20"
            desc="가장 베이직한 형태의 짧은 텍스트 메시지 (90byte 이하)"
            features={[
              { text: "짧은 부고장 링크 전달에 적합" },
              { text: "전 기종 호환성 100%" },
              { text: "실시간 발송 상태 확인" },
            ]}
          />
          <PriceCard
            icon={Mail}
            title="장문 문자 (LMS)"
            price="45"
            desc="상세한 인사말과 부고장 링크를 여유있게 담는 메시지"
            features={[
              { text: "상가 1곳당 평균 300~400건 발송", strong: true },
              { text: "최대 2,000byte 지원" },
              { text: "인사말 + 계좌정보 + 웹부고 링크 조합에 최적화" },
            ]}
            popular
            titleMint
          />
          <PriceCard
            icon={ImageIcon}
            title="사진 문자 (MMS)"
            price="100"
            desc="영정 사진이나 장례식장 약도 이미지를 직접 첨부"
            features={[
              { text: "고화질 이미지 첨부 (최대 3장)" },
              { text: "장문 메시지(2,000byte) 동시 포함" },
              { text: "시각적 정보 전달에 유리" },
            ]}
          />
        </div>

        <section className="border-t border-white/[0.05] bg-[#112240] px-5 py-16 text-center md:pb-[100px] md:pt-[60px]">
          <h2 className="mb-5 text-[1.75rem] font-bold md:text-[2rem]">지금 바로 발송을 시작해 보세요</h2>
          <p className="mb-10 text-[#8892b0]">장례지도사와 장례식장을 위한 완벽한 대량 발송 솔루션</p>
          <Link
            href="/start"
            className="inline-flex items-center gap-2 rounded-lg bg-[#64ffda] px-8 py-4 text-[1.1rem] font-bold text-[#0a192f] no-underline shadow-[0_4px_12px_rgba(100,255,218,0.2)] transition hover:bg-[#4cd6b6] hover:shadow-[0_4px_12px_rgba(100,255,218,0.25)]"
          >
            무료로 시작하기
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </section>
      </div>
    </>
  );
}

function PriceCard({
  icon: Icon,
  title,
  price,
  desc,
  features,
  popular,
  titleMint,
}: {
  icon: LucideIcon;
  title: string;
  price: string;
  desc: string;
  features: FeatureLine[];
  popular?: boolean;
  titleMint?: boolean;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.05] p-8 text-center transition hover:-translate-y-2 hover:border-[#64ffda] hover:shadow-[0_10px_30px_-10px_rgba(100,255,218,0.15)]",
        popular
          ? "border-[rgba(100,255,218,0.4)] bg-gradient-to-b from-[#112240] to-[#0a192f]"
          : "bg-[#112240]",
      )}
    >
      {popular ? (
        <span className="absolute right-4 top-4 rounded-full bg-[rgba(100,255,218,0.1)] px-3 py-1 text-[0.8rem] font-bold text-[#64ffda]">
          가장 많이 쓰여요
        </span>
      ) : null}
      <div
        className={cn(
          "mx-auto mb-6 flex size-16 items-center justify-center rounded-full border border-white/[0.05] bg-[#0a192f] text-[#64ffda]",
          popular && "bg-[rgba(100,255,218,0.1)]",
        )}
      >
        <Icon className="size-7" aria-hidden />
      </div>
      <h2
        className={cn(
          "mb-3 text-xl font-semibold text-[#8892b0]",
          titleMint && "text-[#64ffda]",
        )}
      >
        {title}
      </h2>
      <div className="mb-1 flex items-baseline justify-center text-5xl font-extrabold text-[#e6f1ff]">
        {price}
        <span className="ml-1 text-base font-medium text-[#8892b0]">원 / 건</span>
      </div>
      <p className="mb-8 min-h-[44px] text-[0.9rem] text-[#8892b0]">{desc}</p>
      <ul className="mb-0 list-none space-y-3 text-left">
        {features.map((item) => (
          <li key={item.text} className="flex items-start gap-2.5 text-[0.95rem] text-[#e6f1ff]">
            <Check className="mt-1 size-4 shrink-0 text-[#64ffda]" aria-hidden />
            {item.strong ? <strong>{item.text}</strong> : item.text}
          </li>
        ))}
      </ul>
    </article>
  );
}
