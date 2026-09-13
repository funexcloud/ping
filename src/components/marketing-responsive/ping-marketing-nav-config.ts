import { memberLoginMarketingHref } from "@/lib/member-login-marketing-href";
import { CONDOLENCE_BOOK_PATH } from "@/lib/condolence-paths";
import { PING_CONSOLE_APP_URL } from "@/lib/ping-main-path";
import {
  PING_CONSUMER_HOME_PATH,
  PING_PRODUCT_BUSINESS_PATH,
} from "@/lib/ping-site-seo";

/** 마케팅 헤더 「부고 보내기」 — 로그인 없이 /start */
export const PING_MARKETING_INTRO_HREF = "/intro";
/** 마케팅·정보 페이지 공통 CTA — start 플로 */
export const PING_MARKETING_USE_HREF = "/start?skipIntro=1";
export const PING_MARKETING_ADOPT_HREF = PING_CONSOLE_APP_URL;
/** 소비자 홈 — 부고 대량발송 */
export const PING_MARKETING_HOME_HREF = PING_CONSUMER_HOME_PATH;
/** 디지털 방명록 */
export const PING_MARKETING_CONDOLENCE_HREF = "/condolence";
/** B2B 랜딩 홈 */
export const PING_MARKETING_B2B_HOME_HREF = PING_PRODUCT_BUSINESS_PATH;

export type PingMarketingNavLink = {
  label: string;
  href: string;
  /** 외부(콘솔) 링크 */
  external?: boolean;
};

/** 고객센터 · 제휴문의 · 기술블로그 등 정보 페이지 */
export const PING_MARKETING_INFO_LINKS: PingMarketingNavLink[] = [
  { label: "고객센터", href: "/customer-center" },
  { label: "도입문의", href: "/partnership" },
  { label: "기술블로그", href: "/tech-blog" },
];

/** 마케팅 헤더·드로어 공통 메뉴 — `/`, 로그인, 고객센터 등 */
export function pingMarketingHeaderNavLinks(_isLoggedIn = false): PingMarketingNavLink[] {
  return [
    { label: "부고대량발송", href: PING_MARKETING_HOME_HREF },
    { label: "디지털 방명록", href: PING_MARKETING_CONDOLENCE_HREF },
    { label: "내 방명록", href: CONDOLENCE_BOOK_PATH },
    ...PING_MARKETING_INFO_LINKS,
  ];
}

/** 로그인 전: 로그인 · 로그인 후: 마이페이지 */
export function pingMarketingUtilityLinks(isLoggedIn: boolean): PingMarketingNavLink[] {
  if (isLoggedIn) {
    return [{ label: "마이페이지", href: "/mypage" }];
  }
  return [{ label: "로그인", href: memberLoginMarketingHref("/mypage") }];
}

export function pingMarketingLegalLinks(pingReturn: string): PingMarketingNavLink[] {
  const q = encodeURIComponent(pingReturn);
  return [
    { label: "이용약관", href: `/legal/terms-of-service?pingReturn=${q}` },
    { label: "개인정보처리방침", href: `/legal/privacy-policy?pingReturn=${q}` },
    { label: "취소 및 환불정책", href: `/legal/refund-policy?pingReturn=${q}` },
    { label: "서비스/결제 안내", href: `/legal/service-payment-guide?pingReturn=${q}` },
  ];
}

/** `PingGlobalLayout` 580px 셸 제외 — 이 라이브러리 적용 페이지.
 * `/member-login` 은 `from=marketing` 일 때만 마케팅 셸 (레이아웃에서 쿼리 판별). */
export const PING_MARKETING_RESPONSIVE_PATHS = [
  PING_CONSUMER_HOME_PATH,
  PING_PRODUCT_BUSINESS_PATH,
  "/condolence",
  "/pricing",
  "/customer-center",
  "/inquiry-board",
  "/partnership",
  "/tech-blog",
] as const;

export function isPingMarketingResponsivePath(pathname: string): boolean {
  return (PING_MARKETING_RESPONSIVE_PATHS as readonly string[]).includes(pathname);
}

export function isPingMarketingMemberLogin(pathname: string, from: string | null): boolean {
  return pathname === "/member-login" && from === "marketing";
}
