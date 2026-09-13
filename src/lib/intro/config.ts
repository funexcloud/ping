import {
  testimonialAvatarForVoiceName,
} from "@/lib/testimonial-avatar";

export const BRAND = {
  primary: "var(--primary)",
  coral: "#D85A30",
  success: "var(--color-text-success, #1D9E75)",
} as const;

/** Hero launch splash — 노트북·로켓 브랜드 마크 (투명 PNG) */
export const HERO_LAUNCH_ICON = "/assets/images/ping-io-launch.png";

/** @deprecated Use PhoneMockup. Kept so existing asset paths do not 404. */
export const PHONE_MOCKUP_HERO = "/assets/images/phone-mockup-hero.png";

/** @deprecated Use PhoneMockup. */
export const PHONE_MOCKUP_BEZEL = "/assets/images/phone-mockup-bezel.png";

export const PIPELINE = [
  { key: "paste", label: "부고 준비", ms: 700 },
  { key: "parse", label: "미리보기", ms: 900, desc: "전할 내용을 확인하고 다듬습니다" },
  { key: "ready", label: "발송 준비", ms: 500, desc: "대상과 건수를 확인합니다" },
  { key: "safelink", label: "연락처 가져오기", ms: 0, desc: "주소록에서 연락처를 불러옵니다" },
  { key: "dispatch", label: "한 번에 전달", ms: 0, desc: "선택한 사람에게 보냅니다" },
  { key: "result", label: "결과 확인", ms: 0, desc: "전달 결과를 확인합니다" },
] as const;

export const HERO = {
  h1: ["한 사람씩 보내던", "부고 연락을, 한 번에."],
  sub: "부고 정보를 준비하고, 연락처를 선택해 필요한 분들에게 한 번에 전달하세요. 복잡한 과정 없이 PING이 함께합니다.",
  readyLabel: "선택한 사람에게만 전달",
  hook: "한 번에 전하는 중요한 소식",
} as const;

/** 스크롤 연동 폰 목업(Benefits) — PIPELINE 키와 1:1 */
export const PHONE_FLOW = [
  {
    key: "paste",
    label: "부고 준비",
    title: "부고 링크를 넣거나 내용을 작성하세요",
    body: "받은 부고 주소 또는 직접 작성으로 전할 내용을 준비합니다.",
  },
  {
    key: "parse",
    label: "미리보기",
    title: "전할 부고를 확인하고 다듬습니다",
    body: PIPELINE[1].desc,
  },
  {
    key: "safelink",
    label: "연락처 가져오기",
    title: "주소록에서 연락처를 불러옵니다",
    body: "필요할 때만 Google 로그인으로 이어집니다.",
  },
  {
    key: "dispatch",
    label: "한 번에 전달",
    title: "선택한 사람에게 한 번에 전합니다",
    body: PIPELINE[4].desc,
  },
  {
    key: "result",
    label: "결과 확인",
    title: "전달 결과를 확인합니다",
    body: PIPELINE[5].desc,
  },
] as const;

export type PhoneFlowStepKey = (typeof PHONE_FLOW)[number]["key"];

/** Features(01–03) + Benefits(04–06) — 번호는 배열 인덱스로만 생성 */
export const JOURNEY = [
  ...PHONE_FLOW.slice(0, 3).map((step) => ({
    id: step.key,
    kind: "feature" as const,
    tag: step.label,
    title: step.title,
    body: step.body,
  })),
  {
    id: "reach",
    kind: "reach" as const,
    tag: "닿는 방식",
    heading: ["직접 전한 듯,", "대량으로 대신 보냅니다"] as const,
    body: "PING은 한번에 보내도 한사람 한사람에게 개별적으로 도착합니다.",
  },
  {
    id: "safety",
    kind: "safety" as const,
    tag: "왜 더 안전한가",
    heading: ["대량으로 보내도,", "스팸처럼 보이지 않습니다"] as const,
    items: [
      { icon: "Link", text: "Safe Link 보안주소" },
      { icon: "EyeOff", text: "발신번호 비노출" },
      { icon: "ShieldCheck", text: "스미싱 차단" },
      { icon: "UserCheck", text: "발송 전 본인확인" },
    ] as const,
  },
  {
    id: "done",
    kind: "done" as const,
    tag: "완료",
    heading: ["몇분께 보내든", "선택한 사람에게 전달됩니다"] as const,
    sub: "발송 전과 후에 대상을 확인할 수 있습니다",
    cta: { label: "지금 부고 보내기", href: "/start?skipIntro=1" } as const,
  },
] as const;

export type JourneyItem = (typeof JOURNEY)[number];
export type JourneyFeatureItem = Extract<JourneyItem, { kind: "feature" }>;
export type JourneyBenefitItem = Extract<JourneyItem, { kind: "reach" | "safety" | "done" }>;

export function journeyNo(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export const JOURNEY_FEATURES = JOURNEY.slice(0, 3);
export const JOURNEY_BENEFITS = JOURNEY.slice(3, 6);
export const JOURNEY_BENEFITS_START = JOURNEY_FEATURES.length;

/** @deprecated JOURNEY_BENEFITS 사용 */
export type IntroScene = JourneyBenefitItem;

export const DEMO_OBITUARY = `[부고]
父 김영수(金永洙)님 별세
· 빈소 : 울산하늘공원 3호실
· 발인 : 6월 20일 오전 7시`;

/** Hero 타이핑 — `/start` URL 입력 필드에 붙여넣는 데모 링크 */
export const DEMO_FUNERAL_URL =
  "https://www.ulsan.go.kr/funeral/obituary/kim-youngsoo";

/** 절제된 신뢰 코멘트 — 후기 벽 금지 */
export const LANDING_TRUST_QUOTES = [
  {
    role: "장례지도사",
    org: "울산 ○○장례식장",
    quote: "상주 연락처를 하나씩 돌리느라 밤새 통화하던 일이 줄었습니다.",
  },
  {
    role: "상주",
    org: "비회원 이용",
    quote: "복잡한 설정 없이 붙여넣고 보냈습니다. 받는 분들도 스팸으로 오해하지 않았어요.",
  },
  {
    role: "장례식장 운영",
    org: "경남 ○○의료원 장례식장",
    quote: "발송 전 본인 확인과 보안 링크 덕분에 안내가 더 수월합니다.",
  },
] as const;

/** 랜딩 #testimonials — 장례지도사·일반 이용 관점의 기대·장점 (후기 수집 아님) */
export const LANDING_AUDIENCE_VOICES = [
  {
    id: "voice-director-focus",
    text: "유가족 대신 밤새 연락을 돌리지 않아도 된다면, 현장 안내에만 집중할 수 있습니다.",
    name: "장례지도사",
    role: "기대 · 현장 안내",
    image: testimonialAvatarForVoiceName("장례지도사"),
  },
  {
    id: "voice-general-start",
    text: "복잡한 가입 없이 붙여넣고 시작할 수 있다면, 경황없는 순간에도 바로 쓸 수 있습니다.",
    name: "상주·유가족",
    role: "기대 · 간편 시작",
    image: testimonialAvatarForVoiceName("상주·유가족"),
  },
  {
    id: "voice-director-personal",
    text: "한 번에 보내도 받는 분에게는 따로 도착한다면, 단체 알림 오해를 줄일 수 있습니다.",
    name: "장례지도사",
    role: "장점 · 개별 도착",
    image: testimonialAvatarForVoiceName("장례지도사"),
  },
  {
    id: "voice-general-speed",
    text: "2분이면 발송이 끝난다면, 연락처만 정리해 두고 바로 안내할 수 있습니다.",
    name: "상주·유가족",
    role: "기대 · 빠른 발송",
    image: testimonialAvatarForVoiceName("상주·유가족"),
  },
  {
    id: "voice-hall-trust",
    text: "발송 전 확인과 보안 링크가 있다면, 상주 설득 부담도 덜어질 것 같습니다.",
    name: "장례식장",
    role: "장점 · 신뢰 전달",
    image: testimonialAvatarForVoiceName("장례식장"),
  },
  {
    id: "voice-general-spam",
    text: "스팸으로 오해받지 않는다면, 중요한 부고가 제대로 전달될 것 같습니다.",
    name: "상주·유가족",
    role: "기대 · 안심 발송",
    image: testimonialAvatarForVoiceName("상주·유가족"),
  },
  {
    id: "voice-director-draft",
    text: "부고를 준비한 뒤 연락처만 고르면, 새벽에도 발송 준비가 빨라질 것입니다.",
    name: "장례지도사",
    role: "장점 · 자동 정리",
    image: testimonialAvatarForVoiceName("장례지도사"),
  },
  {
    id: "voice-general-privacy",
    text: "개인 번호 없이 보낼 수 있다면, 발송 후에도 마음이 편할 것 같습니다.",
    name: "일반 이용",
    role: "기대 · 번호 보호",
    image: testimonialAvatarForVoiceName("일반 이용"),
  },
  {
    id: "voice-hall-complete",
    text: "발송 완료까지 한 화면에서 본다면, 누락 걱정 없이 안내를 마칠 수 있습니다.",
    name: "장례식장",
    role: "장점 · 완료 확인",
    image: testimonialAvatarForVoiceName("장례식장"),
  },
] as const;

export const LANDING_FINAL_CTA = {
  label: "부고 보내기",
  href: "/start?skipIntro=1",
} as const;

export const MAGIC_SECTIONS = {
  hero: {
    id: "hero",
    label: "The Shift",
  },
  experience: {
    id: "experience",
    label: "Experience",
    title: "실제 발송 화면, 그대로",
    lead: "부고 준비부터 결과 확인까지 — `/start` 위저드와 동일한 흐름입니다.",
  },
  journey: {
    id: "features",
    label: "Features",
    title: "핵심 과정",
    lead: "부고 준비, 연락처 가져오기, 대상 선택, 한 번에 전달까지입니다.",
  },
  /** @deprecated MAGIC_SECTIONS.journey 사용 */
  features: {
    id: "features",
    label: "Features",
    title: "핵심 과정",
    lead: "부고 URL만 있으면 문자 작성·연락처·결제까지 이어집니다.",
  },
  /** @deprecated MAGIC_SECTIONS.journey 사용 */
  benefits: {
    id: "benefits",
    label: "Benefits",
    title: "대량 발송이 이렇게 달라집니다",
    lead: "닿는 방식·보안·완료까지 한 번에 확인하세요.",
  },
  testimonials: {
    id: "testimonials",
    label: "For you",
    title: "현장의 목소리를 듣고 있습니다",
    lead: "장례지도사와 유가족이 부고핑을 먼저 만나보았습니다.",
  },
  pricing: {
    id: "pricing",
    label: "Pricing",
    title: "기본료 없이, 쓴 만큼만",
  },
  faq: {
    id: "faq",
    label: "FAQ",
    title: "자주 묻는 질문",
  },
  cta: {
    id: "start",
    label: "Get Started",
    title: "지금 부고를 전하세요",
  },
  /** @deprecated PhoneFlow 헤더 — experience 사용 */
  benefitsLegacy: {
    label: "Benefits",
    title: "웹에서 바로, 발송까지",
    lead: "부고 준비에서 결과 확인까지 — 실제 발송 화면 흐름 그대로입니다.",
  },
} as const;
