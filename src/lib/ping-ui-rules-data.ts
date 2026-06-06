/** UI 규칙 ID — `docs/UI-GUIDE.md`·`.cursor/rules`·`ping-ui.css` DESIGN CONTRACT 통합 */
export type UiRuleId =
  | "tokens-root"
  | "layout-400"
  | "shell-product"
  | "top-nav"
  | "main-tight"
  | "bordered-panel"
  | "input-field-standard"
  | "btn-primary"
  | "overflow-flex"
  | "bulk-logo-bar"
  | "modal-width";

export type UiRuleCategory = "foundation" | "layout" | "component" | "flow";

export type UiRule = {
  id: UiRuleId;
  category: UiRuleCategory;
  title: string;
  summary: string;
  doList: string[];
  dontList: string[];
  cssRef?: string;
  cursorRule?: string;
};

export type UiRolloutStatus = "todo" | "in_progress" | "done";

export type UiRolloutGroup =
  | "bulk"
  | "auth"
  | "obituary"
  | "account"
  | "marketing"
  | "admin";

export type UiRolloutPage = {
  id: string;
  route: string;
  label: string;
  group: UiRolloutGroup;
  priority: number;
  /** 이 페이지에 적용할 규칙 ID */
  ruleIds: UiRuleId[];
  defaultStatus: UiRolloutStatus;
  note?: string;
};

export const UI_RULE_CATEGORY_LABEL: Record<UiRuleCategory, string> = {
  foundation: "기반",
  layout: "레이아웃",
  component: "컴포넌트",
  flow: "플로우",
};

export const UI_ROLLOUT_GROUP_LABEL: Record<UiRolloutGroup, string> = {
  bulk: "대량 발송·결제",
  auth: "로그인·본인인증",
  obituary: "부고 작성",
  account: "마이페이지",
  marketing: "마케팅·안내",
  admin: "관리",
};

/** 코드 기준(토스 블루) — `docs/UI-GUIDE.md` §2 Vercel 흑백 서술과 다름 */
export const UI_DESIGN_TOKENS = [
  { name: "Primary", var: "--ping-primary", hex: "#3182f6", role: "CTA·링크·진행바" },
  { name: "Primary dark", var: "--ping-primary-dark", hex: "#1e64d4", role: "호버·강조" },
  { name: "Canvas", var: "--ping-bg", hex: "#f2f4f6", role: "앱 바깥 배경" },
  { name: "Surface", var: "--ping-surface", hex: "#ffffff", role: "셸·카드·패널" },
  { name: "Field fill", var: "--ping-field-fill", hex: "#f2f4f6", role: "입력 배경" },
  { name: "Title", var: "--ping-ui-text", hex: "#191f28", role: "제목·본문 강조" },
  { name: "Body", var: "--ping-ui-text-sub", hex: "#6b7684", role: "보조 설명" },
  { name: "Caption", var: "--ping-ui-text-hint", hex: "#b0b8c1", role: "캡션·플레이스홀더" },
  { name: "Panel border", var: "--ping-panel-border", hex: "#e5e8eb", role: "그룹 패널 테두리" },
  { name: "Divider", var: "--ping-divider", hex: "#e9ecf0", role: "얇은 구분선" },
] as const;

export const UI_RULES: UiRule[] = [
  {
    id: "tokens-root",
    category: "foundation",
    title: "토큰 단일 출처",
    summary: "색·라운드·그림자는 `assets/css/ping-ui.css` `:root`만 수정한다.",
    doList: [
      "`var(--ping-*)` / Tailwind `ping-*` 유틸 사용",
      "변경 시 DESIGN CONTRACT 주석과 함께 토큰 추가",
    ],
    dontList: [
      "페이지 CSS에 `:root { --my-color }` 중복 정의",
      "컴포넌트에 `#3182f6` 등 헥스 하드코딩 (데모·스크린샷 제외)",
    ],
    cssRef: "assets/css/ping-ui.css",
    cursorRule: "ping-ui-design-system.mdc",
  },
  {
    id: "layout-400",
    category: "layout",
    title: "400px 중앙 컬럼",
    summary: "모바일 제품 UI는 최대 400px 컬럼 안에서만 동작한다.",
    doList: [
      "`PingGlobalLayout` + `max-w-[400px]`",
      "`.ping-shell` / `.app-shell` (`max-width: 400px`)",
      "모달·시트도 `min(400px, 100%)`",
    ],
    dontList: ["448px(`28rem`)·`max-w-md`로 셸보다 넓게", "전역 푸터만 954px 등으로 깨기"],
    cssRef: "src/components/ping-global-layout.tsx",
  },
  {
    id: "shell-product",
    category: "layout",
    title: "제품 셸",
    summary: "bulk `/start`: 회색 셸 + 흰 위저드 열(네비·progress·본문). 그 외 bulk flow는 `--ping-bg` 캔버스.",
    doList: [
      "`ping-shell`: 흰 면 + `--ping-surface`, ≥480px 라운드",
      "bulk `/start`: `bulk-entry-shell`(`--ping-bg`) + 네비·progress·section `--ping-surface`",
      "카드·폼 묶음: `ping-bordered-panel`",
    ],
    dontList: ["페이지마다 다른 max-width·shadow 조합", "인라인 `style`로 배경색 지정"],
    cssRef: "html.ping-ui .ping-shell",
  },
  {
    id: "top-nav",
    category: "layout",
    title: "상단 네비",
    summary: "bulk flow·인증: `ping-top-nav ping-top-nav--blend` + 뒤로 + 제목. `/start` 위저드만 예외.",
    doList: [
      "`/start`·`/send/payments`: `ping-top-nav`(blend 없음) — `BulkFlowProgress`·본문과 동일 `--ping-surface`",
      "`/login` 등 회색 캔버스: `ping-top-nav ping-top-nav--blend` + `--ping-bg`",
      "sticky, padding `14px 18px`",
    ],
    dontList: [
      "`/start`에서 `--blend`로 progress(흰)와 네비(회색) 색 분리",
      "페이지별 커스텀 header shadow",
    ],
    cssRef: "html.ping-ui .ping-top-nav",
    cursorRule: "ping-bordered-panel.mdc",
  },
  {
    id: "main-tight",
    category: "layout",
    title: "본문 영역",
    summary: "위저드·폼은 `ping-main ping-main--tight-top` + 상단 12px.",
    doList: ["padding `24px 18px 40px` (tight-top은 top 18px)", "패널·스택에 `min-w-0 max-w-full`"],
    dontList: ["main padding을 페이지마다 임의 px", "flex 자식 overflow 방치"],
    cssRef: "html.ping-ui .ping-main",
  },
  {
    id: "bordered-panel",
    category: "component",
    title: "그룹 패널",
    summary: "제목+입력+CTA 묶음은 `ping-bordered-panel`.",
    doList: [
      "`ping-bordered-panel p-5 min-w-0 max-w-full`",
      "테두리 `--ping-panel-border` 1.5px, radius 16px, shadow 없음",
    ],
    dontList: ["`shadow-sm` / `border-ping-muted`", "패널마다 border hex 따로"],
    cssRef: "html.ping-ui .ping-bordered-panel",
    cursorRule: "ping-bordered-panel.mdc",
  },
  {
    id: "input-field-standard",
    category: "component",
    title: "표준 단일행 입력",
    summary: "제품 플로 URL·로그인·인증 이메일 등은 `input-field ping-field-standard`. 기준: `/start` URL 입력.",
    doList: [
      "`input-field ping-field-standard w-full max-w-full min-w-0`",
      "유효값 강조: `ping-field-standard--valid`",
      "우측 카운터·토글: `ping-field-standard--with-trailing` 또는 pw-wrap CSS",
      "결제 숫자: `ping-field-standard ping-field-numeric`",
    ],
    dontList: [
      "페이지 BEM으로 hover/focus ring 재정의 (`bulk-url-step__input` 등)",
      "Tailwind `border`/`focus:ring`으로 input-field 덮기",
      "OTP(`verify-otp-digit`/`guest-otp-digit`)·checkbox·`input-outline`·admin shadcn에 standard 적용",
    ],
    cssRef: "html.ping-ui input.input-field.ping-field-standard",
    cursorRule: "ping-bordered-panel.mdc",
  },
  {
    id: "btn-primary",
    category: "component",
    title: "주요 CTA",
    summary: "하단·전폭 액션은 `ping-btn-primary` (shadcn outline 아님).",
    doList: [
      "전폭 block, 16px/800, `--ping-primary`, border none",
      "보조는 `ping-btn-secondary`",
    ],
    dontList: [
      "shadcn `Button variant=outline`에 회색 테두리로 CTA",
      "작은 default Button만 두고 전폭 CTA 생략",
    ],
    cssRef: "html.ping-ui .ping-btn-primary",
  },
  {
    id: "overflow-flex",
    category: "component",
    title: "Flex overflow",
    summary: "flex/grid 안 입력·스택은 `min-width: 0`·`box-border`로 넘침 방지.",
    doList: [
      "`.ping-stack`, `#guest-block-info` 등 `min-w-0 max-w-full`",
      "shadcn 입력·버튼은 `box-border` (preflight off → content-box 기본)",
    ],
    dontList: [
      "긴 URL·번호가 400px 밖으로 삐져나감",
      "`w-full` + `px-3`인데 box-sizing 없이 패딩만큼 overflow",
    ],
    cssRef: "ping-ui.css (input min-width: 0)",
  },
  {
    id: "bulk-logo-bar",
    category: "flow",
    title: "Bulk 로고 바",
    summary: "`/start` 이후 bulk step에는 `BulkFlowLogoBar`를 둔다.",
    doList: [
      "`/send/payments`, `/login`(bulk), `/obituary-guest-verify`(bulk), `/checkout`, `/payment-success`",
      "로고 `--ping-bg` strip, `/start` `bulk-page-header`와 동일 비율",
    ],
    dontList: ["progress만 있고 로고 없음", "로고 max-width 448px"],
    cssRef: "src/components/bulk/bulk-flow-logo-bar.tsx",
  },
  {
    id: "modal-width",
    category: "flow",
    title: "바텀 시트·모달 너비",
    summary: "오버레이 시트는 셸과 같은 400px 상한.",
    doList: ["`max-width: min(400px, 100%)`", "내부 list/row `min-w-0`"],
    dontList: ["`max-width: 28rem` (448px)", "viewport 전체 폭 fixed dialog"],
    cssRef: "src/components/bulk/recipient-exclude-modal.css",
  },
];

export const UI_ROLLOUT_PAGES: UiRolloutPage[] = [
  {
    id: "start",
    route: "/start",
    label: "연락처·발송 시작",
    group: "bulk",
    priority: 1,
    ruleIds: ["layout-400", "shell-product", "bordered-panel", "top-nav", "overflow-flex", "tokens-root", "input-field-standard"],
    defaultStatus: "done",
    note: "기준 화면 — bulk-page-header 로고 · 입력 CSS 기준(ping-field-standard)",
  },
  {
    id: "send-url",
    route: "/send/url",
    label: "부고 URL 입력",
    group: "bulk",
    priority: 2,
    ruleIds: ["layout-400", "shell-product", "bordered-panel", "top-nav", "main-tight", "overflow-flex", "input-field-standard"],
    defaultStatus: "done",
  },
  {
    id: "send-payments",
    route: "/send/payments",
    label: "발송·결제 확인",
    group: "bulk",
    priority: 3,
    ruleIds: ["layout-400", "shell-product", "top-nav", "main-tight", "bordered-panel", "btn-primary", "bulk-logo-bar"],
    defaultStatus: "in_progress",
  },
  {
    id: "login",
    route: "/login",
    label: "로그인 선택",
    group: "auth",
    priority: 4,
    ruleIds: ["layout-400", "shell-product", "top-nav", "main-tight", "bordered-panel", "bulk-logo-bar"],
    defaultStatus: "in_progress",
    note: "부고 시작·bulk 로그인 공통",
  },
  {
    id: "guest-verify",
    route: "/obituary-guest-verify",
    label: "비회원 본인인증",
    group: "auth",
    priority: 5,
    ruleIds: ["layout-400", "shell-product", "top-nav", "main-tight", "btn-primary", "overflow-flex", "bulk-logo-bar"],
    defaultStatus: "in_progress",
  },
  {
    id: "checkout",
    route: "/checkout",
    label: "결제",
    group: "bulk",
    priority: 6,
    ruleIds: ["layout-400", "shell-product", "bordered-panel", "bulk-logo-bar", "btn-primary", "overflow-flex", "input-field-standard"],
    defaultStatus: "done",
  },
  {
    id: "payment-success",
    route: "/payment-success",
    label: "결제 완료",
    group: "bulk",
    priority: 7,
    ruleIds: ["layout-400", "bulk-logo-bar", "modal-width", "tokens-root"],
    defaultStatus: "in_progress",
  },
  {
    id: "member-login",
    route: "/member-login",
    label: "이메일 로그인",
    group: "auth",
    priority: 8,
    ruleIds: ["layout-400", "shell-product", "top-nav", "bordered-panel", "btn-primary", "input-field-standard"],
    defaultStatus: "done",
  },
  {
    id: "obituary-form",
    route: "/obituary-form",
    label: "부고 작성 폼",
    group: "obituary",
    priority: 10,
    ruleIds: ["layout-400", "shell-product", "tokens-root", "overflow-flex"],
    defaultStatus: "todo",
    note: "대형 폼 — shadcn 마이그레이션 진행 중",
  },
  {
    id: "obituary-create",
    route: "/obituary-create",
    label: "부고 생성",
    group: "obituary",
    priority: 11,
    ruleIds: ["layout-400", "shell-product", "bordered-panel", "top-nav"],
    defaultStatus: "todo",
  },
  {
    id: "signup-join-type",
    route: "/obituary-signup-join-type",
    label: "가입 유형",
    group: "auth",
    priority: 12,
    ruleIds: ["layout-400", "shell-product", "bordered-panel", "btn-primary"],
    defaultStatus: "todo",
  },
  {
    id: "verify-email",
    route: "/obituary-verify-email",
    label: "이메일 인증",
    group: "auth",
    priority: 13,
    ruleIds: ["layout-400", "shell-product", "bordered-panel", "btn-primary", "input-field-standard"],
    defaultStatus: "done",
    note: "이메일 한 줄만 standard — OTP 6칸 제외",
  },
  {
    id: "signup-terms",
    route: "/obituary-signup-terms",
    label: "회원가입 약관",
    group: "auth",
    priority: 14,
    ruleIds: ["layout-400", "shell-product", "btn-primary"],
    defaultStatus: "todo",
  },
  {
    id: "signup-register",
    route: "/obituary-signup-register",
    label: "회원가입",
    group: "auth",
    priority: 15,
    ruleIds: ["layout-400", "shell-product", "bordered-panel", "btn-primary", "input-field-standard"],
    defaultStatus: "done",
  },
  {
    id: "mypage",
    route: "/mypage",
    label: "마이페이지",
    group: "account",
    priority: 20,
    ruleIds: ["layout-400", "tokens-root"],
    defaultStatus: "todo",
  },
  {
    id: "products",
    route: "/products/ping",
    label: "제품 소개",
    group: "marketing",
    priority: 30,
    ruleIds: ["layout-400", "tokens-root"],
    defaultStatus: "todo",
  },
  {
    id: "admin-dashboard",
    route: "/admin/dashboard",
    label: "관리 대시보드",
    group: "admin",
    priority: 40,
    ruleIds: ["tokens-root"],
    defaultStatus: "todo",
    note: "ping-dashboard-dark 예외 가능",
  },
];

export const UI_RULES_STORAGE_KEY = "ping_ui_rules_rollout_v1";

export function getRuleById(id: UiRuleId): UiRule | undefined {
  return UI_RULES.find((r) => r.id === id);
}

export function countRolloutProgress(
  pages: UiRolloutPage[],
  statusMap: Record<string, UiRolloutStatus>,
): { done: number; total: number; percent: number } {
  const total = pages.length;
  const done = pages.filter((p) => (statusMap[p.id] ?? p.defaultStatus) === "done").length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
