import type { Metadata } from "next";
import { LEGAL_SLUGS } from "@/content/legal";

/** 프로덕션 캐논 오리진 (Vercel·메타·사이트맵·JSON-LD 공통) */
export const PING_SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://ping.funexcloud.com").replace(/\/$/, "");

export const PING_ORG = {
  name: "PING",
  legalName: "한국AIBC융합원",
  brand: "PING 부고 대량발송",
  email: "kaibcmac@gmail.com",
  locale: "ko_KR",
  country: "KR",
} as const;

export const PING_DEFAULT_DESCRIPTION =
  "PING(핑)은 부고 링크 검증, 엑셀·주소록 업로드, 알림톡·SMS 대량 발송, 결제까지 한 흐름으로 처리하는 부고 커뮤니케이션 SaaS입니다.";

export const PING_DEFAULT_KEYWORDS = [
  "PING",
  "핑",
  "부고",
  "부고 문자",
  "부고 대량발송",
  "알림톡 부고",
  "SMS 부고",
  "장례 문자",
  "장례식장 발송",
  "엑셀 문자 발송",
];

const OG_IMAGE = `${PING_SITE_URL}/assets/og/og-index-dispatch.png`;

/** PING 마케팅 상세(기능·요금 요약·도입 CTA) 캐논 경로 */
export const PING_PRODUCT_MARKETING_PATH = "/products/ping";

/** 랜딩·가이드·약관 등 검색·GEO 대상 공개 URL (우선순위 순) */
export const PING_SITEMAP_ENTRIES: {
  path: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: PING_PRODUCT_MARKETING_PATH, changeFrequency: "weekly", priority: 0.95 },
  { path: "/start", changeFrequency: "weekly", priority: 0.9 },
  { path: "/intro", changeFrequency: "monthly", priority: 0.85 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.85 },
  { path: "/saas", changeFrequency: "monthly", priority: 0.8 },
  { path: "/customer-center", changeFrequency: "monthly", priority: 0.75 },
  { path: "/partnership", changeFrequency: "monthly", priority: 0.7 },
  { path: "/inquiry-board", changeFrequency: "monthly", priority: 0.65 },
  { path: "/tech-blog", changeFrequency: "monthly", priority: 0.6 },
  { path: "/guide/naver-contacts", changeFrequency: "monthly", priority: 0.7 },
  ...LEGAL_SLUGS.map((slug) => ({
    path: `/legal/${slug}`,
    changeFrequency: "yearly" as const,
    priority: 0.5,
  })),
];

/** FAQ — overview JSON-LD·GEO 요약 공용 */
export const PING_OVERVIEW_FAQ = [
  {
    question: "비회원도 결제할 수 있나요?",
    answer:
      "가능합니다. 결제 단계에서 신청자 정보를 입력해 진행할 수 있으며, 정책 페이지에서 결제·환불 기준을 함께 확인할 수 있습니다.",
  },
  {
    question: "발송 전 무엇을 꼭 확인해야 하나요?",
    answer:
      "부고 링크 형식과 유효 연락처 건수, 신청자 정보를 반드시 확인해 주세요. 이 단계 확인이 운영 오류를 크게 줄여줍니다.",
  },
  {
    question: "결제 금액과 페이지 표시 금액이 다를 수 있나요?",
    answer:
      "심사 기준상 동일해야 하며, PING은 발송 건수와 건당 요금을 기준으로 금액을 계산해 결제창과 일치하도록 구성합니다.",
  },
] as const;

export const PING_GEO_SUMMARY = `PING(핑, ${PING_SITE_URL})은 한국AIBC융합원이 운영하는 부고·장례 커뮤니케이션 SaaS입니다. 외부 부고 URL 검증, Google·엑셀 주소록, 카카오 알림톡·SMS·MMS 대량 발송, 건당 과금 결제(토스페이먼츠)를 지원합니다. 서비스 소개: ${PING_SITE_URL}${PING_PRODUCT_MARKETING_PATH} · 요금: ${PING_SITE_URL}/pricing · 발송 시작: ${PING_SITE_URL}/start`;

type PublicMetadataInput = {
  title: string;
  description?: string;
  path: string;
  keywords?: string[];
  ogType?: "website" | "article";
  ogImage?: string;
  noindex?: boolean;
};

export function buildPublicMetadata(input: PublicMetadataInput): Metadata {
  const description = input.description ?? PING_DEFAULT_DESCRIPTION;
  const canonical = input.path === "/" ? PING_SITE_URL : `${PING_SITE_URL}${input.path}`;
  const ogImage = input.ogImage ?? OG_IMAGE;

  return {
    title: input.title,
    description,
    keywords: [...PING_DEFAULT_KEYWORDS, ...(input.keywords ?? [])],
    alternates: { canonical },
    robots: input.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: input.ogType ?? "website",
      locale: PING_ORG.locale,
      url: canonical,
      siteName: PING_ORG.brand,
      title: input.title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: PING_ORG.brand }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: [ogImage],
    },
  };
}

export const PING_NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
