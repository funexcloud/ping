import { PING_COMPANY_LEGAL } from "@/lib/ping-company-legal";
import { PING_MAIN_APP_PATH } from "@/lib/ping-main-path";

/** 스토리 섹션 — TODO: 실명·상담 인원·대표 사진 확정 시 갱신 */
export const LANDING_CEO_NAME = PING_COMPANY_LEGAL.representative;

/** TODO: 실제 상담 인원 수(N) 확정 */
export const LANDING_CONSULT_COUNT = "___";

export const LANDING_CONSULT_STAT_PERCENT = "94";

/** 디스플레이 타이틀과 같은 랭크의 영어 키커 (CSS `uppercase`) */
export const LANDING_SECTION_EYEBROWS = {
  oldWay: "Problem",
  hero: "The Shift",
  story: "Story",
  research: "Research",
  security: "Security",
  iteration: "Iteration",
  product: "Product",
  rates: "Rates",
} as const;

/** 모바일 제목 줄바꿈 지점(해당 문자열까지 첫 줄). PC는 한 줄. */
export const LANDING_TITLE_BREAKS = {
  oldWay: "부고는",
  story: "그래서,",
  research: "진심만으로는",
  security: "부고 한 통에도,",
  iteration: "2,000시간,",
  product: "그 모든 고민은,",
  pricing: "요금,",
  rates: "기본료 없이,",
  testimonials: "현장의 목소리를",
} as const;

/** `#the-shift` 연구 브릿지 — StorySection(94%) 바로 아래 */
export const LANDING_RESEARCH_TITLE = "진심만으로는 부족했습니다";

export const LANDING_RESEARCH_LEAD =
  "현장에서 들은 불편을, 기획·설계·개발까지 직접 풀었습니다.";

/** Before/After 그리드 아래 — 통신·CDN 보안 */
export const LANDING_SHIFT_SECURITY_TITLE = "부고 한 통에도, 은행 수준의 보안을";

export const LANDING_SHIFT_SECURITY_LEAD = "방통위 기준, 글로벌 CDN 수준으로 지었습니다";

/** 보안·CDN 아래 — 개발 기록 Bento Pan */
export const LANDING_SHIFT_ITERATION_TITLE = "2,000시간, 고치고 또 고쳤습니다";

export const LANDING_SHIFT_ITERATION_LEAD = "보이지 않는 곳에 2,000시간을 썼습니다";

/** `#features` 위 — SpecialText 디코더 (줄 단위 순차) */
export const LANDING_FEATURES_SPECIAL_LINES = [
  "끝까지, 아름답게",
  "디지털장례 시대의 예고",
  "보안기술로 완벽함까지",
] as const;

/** @deprecated `LANDING_FEATURES_SPECIAL_LINES` 사용 */
export const LANDING_FEATURES_SPECIAL_TEXT = LANDING_FEATURES_SPECIAL_LINES[0];

/** `#features` 위 — Verified 배지 라벨 */
export const LANDING_FEATURES_VERIFIED_LABEL = "PING";

export const LANDING_RESEARCH_STAGES = {
  think: {
    label: "고민",
    caption: "현장 불편을 짚고",
    shimmer: "CEO is thinking ...",
  },
  design: {
    label: "설계",
    caption: "방식을 하나씩 적어 가며",
    typewriter: "상담을 마친 맏상주가, 오고 있는 가족에게 동시에 알릴 수 있을까",
  },
  build: {
    title: "그 모든 고민은, 가장 단순한 화면으로만 남았습니다.",
    lead: "보내는 순간, 모두에게 가닿는 작은 신호 '핑'입니다.",
  },
} as const;

/** 대표 사진 — `public/assets/images/landing-ceo-photo.png` */
export const LANDING_CEO_PHOTO: string | null = "/assets/images/landing-ceo-photo.png";

export const LANDING_CEO_STORY_URL = "https://ceo.funexcloud.com";

/** 스토리 섹션 — 회전 인용문 */
export const LANDING_STORY_TITLE = "그래서, 바꾸기로 했습니다";
export const LANDING_STORY_LEAD = "부고핑을 만든 마음";

export const LANDING_STORY_QUOTES = [
  "맏상주는 장례상담을 마치고, 식장으로 오고 있는 가족에게 바로 알려야 합니다.",
  "그 짧은 시간에 부고장과 안내 문자를 동시에 써야 합니다.",
  "그 순간을 위한 기술은, 현장에서만 만들 수 있었습니다.",
  "주식회사동반 대표이사 송지훈이, 그 길을 열었습니다.",
] as const;

/** Hero banner 배경 — 랜딩 하단 CTA */
export const LANDING_FINAL_HERO_BACKGROUND = "/assets/images/landing-final-hero.png";

export const LANDING_CEO_TITLE =
  "장례지도사. 주식회사동반, 한국AIBC융합원, 한국장례문화원 공동 대표";

/**
 * 발송 플로 1스텝 — `/intro` → `/start` 9단계 위저드.
 * URL은 sessionStorage `ping_from_index` 에 저장 후 `bulkAfterUrl=1` 로 이어짐.
 */
export const LANDING_SEND_FLOW_PATH = PING_MAIN_APP_PATH;

/** 레거시·직접 진입용 (마케팅 CTA·히어로 폼은 사용하지 않음) */
export const LANDING_SEND_SKIP_INTRO = "skipIntro=1";

export const LANDING_SEND_BULK_AFTER_URL = "bulkAfterUrl=1";

/** 광고·마케팅 주 CTA — 로그인 벽 없이 /start 로 진입 */
export const LANDING_START_HREF = `${PING_MAIN_APP_PATH}?${LANDING_SEND_SKIP_INTRO}`;

export const LANDING_START_CTA_LABEL = "부고 보내기";

/** 사용 방법 — 같은 랜딩의 3단계 섹션 */
export const LANDING_HOW_HREF = "#features";

/** 히어로 프리뷰 카드 더미 — TODO: 03 데모에서 애니메이션화 */
export const LANDING_HERO_PREVIEW = {
  sampleUrl: "obit.example.com/notice/8a2f…",
  rows: [
    { label: "고인", value: "故 김○○" },
    { label: "빈소", value: "○○병원 장례식장 301호" },
    { label: "발인", value: "2026.6.10 (수) 오전 7시" },
    { label: "상주", value: "장남 김○○ 외 2명" },
  ],
} as const;
