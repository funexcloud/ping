import type { Metadata } from "next";
import { LEGAL_SLUGS } from "@/content/legal";
import { PING_BRAND_NAME } from "@/lib/ping-brand";

/** 프로덕션 캐논 오리진 (Vercel·메타·사이트맵·JSON-LD 공통) */
export const PING_SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://ping.funexcloud.com").replace(/\/$/, "");

export const PING_ORG = {
  name: PING_BRAND_NAME,
  legalName: "한국AIBC융합원",
  brand: PING_BRAND_NAME,
  email: "kaibcmac@gmail.com",
  locale: "ko_KR",
  country: "KR",
} as const;

export const PING_DEFAULT_DESCRIPTION =
  "PING(핑)은 스마트폰 주소록에서 연락처를 가져와 중요한 부고 소식을 선택한 사람에게 한 번에 전달하는 서비스입니다.";

export const PING_DEFAULT_KEYWORDS = [
  "PING",
  "핑",
  "부고",
  "부고 문자",
  "부고 대량발송",
  "부고 보내기",
  "부고 알림",
  "단체 부고 문자",
  "연락처 부고 발송",
  "알림톡 부고",
  "SMS 부고",
];

const OG_IMAGE = `${PING_SITE_URL}/assets/og/og-index-dispatch.png`;

/** 소비자 홈 (유가족 랜딩) — `/` → intro → `/start` */
export const PING_CONSUMER_HOME_PATH = "/";

/** B2B 제품 트리 루트 (`/products/ping` → business 리다이렉트) */
export const PING_PRODUCT_MARKETING_PATH = "/products/ping";

/** B2B 마케팅 캐논 */
export const PING_PRODUCT_BUSINESS_PATH = "/products/ping/business";

/** 랜딩·가이드·약관 등 검색·GEO 대상 공개 URL (우선순위 순) */
export const PING_SITEMAP_ENTRIES: {
  path: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
}[] = [
  { path: PING_CONSUMER_HOME_PATH, changeFrequency: "weekly", priority: 1 },
  { path: PING_PRODUCT_BUSINESS_PATH, changeFrequency: "weekly", priority: 0.9 },
  { path: "/start", changeFrequency: "weekly", priority: 0.9 },
  { path: "/intro", changeFrequency: "monthly", priority: 0.85 },
  { path: "/condolence", changeFrequency: "weekly", priority: 0.85 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.85 },
  { path: "/saas", changeFrequency: "monthly", priority: 0.8 },
  { path: "/customer-center", changeFrequency: "monthly", priority: 0.8 },
  { path: "/partnership", changeFrequency: "monthly", priority: 0.7 },
  { path: "/inquiry-board", changeFrequency: "monthly", priority: 0.65 },
  { path: "/tech-blog", changeFrequency: "monthly", priority: 0.6 },
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

export const PING_GEO_SUMMARY = `PING(핑, ${PING_SITE_URL})은 스마트폰 주소록에서 연락처를 가져와 중요한 부고 문자·알림을 선택한 사람에게 한 번에 전달하는 서비스입니다. 부고를 준비하고, 보낼 사람을 고른 뒤 발송 결과까지 확인할 수 있습니다. 개인 이용: ${PING_SITE_URL}${PING_CONSUMER_HOME_PATH} · 발송 시작: ${PING_SITE_URL}/start`;

type PublicMetadataInput = {
  title: string;
  description?: string;
  path: string;
  /** canonical URL 경로 (미지정 시 path 사용) */
  canonicalPath?: string;
  keywords?: string[];
  ogType?: "website" | "article";
  ogImage?: string;
  noindex?: boolean;
};

export function buildPublicMetadata(input: PublicMetadataInput): Metadata {
  const description = input.description ?? PING_DEFAULT_DESCRIPTION;
  const canonPath = input.canonicalPath ?? input.path;
  const canonical = canonPath === "/" ? PING_SITE_URL : `${PING_SITE_URL}${canonPath}`;
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
