import type { BulkFlowStep, BulkWizardStep } from "@/lib/ping-bulk-flow-steps";

/** 화면 제목 + 토스형 보조 한 줄 */
export type StepCopy = {
  title: string;
  subtitle: string;
  docTitle?: string;
};

/** 9단계 진행바·단계 공통 */
export const BULK_FLOW_NINE_COPY: Record<BulkFlowStep, StepCopy> = {
  1: {
    title: "부고 주소 입력",
    subtitle: "링크를 붙여넣으면 문자 내용을 자동으로 가져올게요",
    docTitle: "PING · 부고 주소",
  },
  2: {
    title: "부고 문자 확인",
    subtitle: "제목·본문을 확인하고 필요하면 수정해 주세요",
    docTitle: "PING · 부고 문자",
  },
  3: {
    title: "연락처 가져오기",
    subtitle: "Google 연락처 또는 주소록 파일을 선택해 주세요",
    docTitle: "PING · 연락처",
  },
  4: {
    title: "결제 금액 확인",
    subtitle: "건수와 금액을 확인한 뒤 다음으로 진행해요",
    docTitle: "PING · 결제 금액",
  },
  5: {
    title: "본인 확인",
    subtitle: "회원·비회원 중 편한 방법을 선택해 주세요",
    docTitle: "PING · 본인 확인",
  },
  6: {
    title: "결제하기",
    subtitle: "결제를 완료하면 발송을 시작할게요",
    docTitle: "PING · 결제",
  },
  7: {
    title: "발송 준비 중",
    subtitle: "주문을 확인하고 있어요. 잠시만 기다려 주세요",
    docTitle: "PING · 발송 처리",
  },
  8: {
    title: "발송 완료",
    subtitle: "결제가 완료됐어요. 발송이 곧 시작됩니다",
    docTitle: "PING · 발송 완료",
  },
  9: {
    title: "부의금 명단",
    subtitle: "발송하신 분들의 명단을 정리할 수 있어요",
    docTitle: "PING · 부의금 명단",
  },
};

const THANKYOU_WIZARD_COPY: Record<BulkWizardStep, StepCopy> = {
  url: BULK_FLOW_NINE_COPY[1],
  compose: {
    title: "답례 문자 작성",
    subtitle: "보낼 문구를 확인·수정해 주세요",
    docTitle: "PING · 답례 문자",
  },
  pick: {
    title: "명단 파일 올리기",
    subtitle: "엑셀·CSV·VCard 또는 Google 연락처로 올려 주세요",
    docTitle: "PING · 답례 명단",
  },
  review: BULK_FLOW_NINE_COPY[4],
};

const OBITUARY_WIZARD_COPY: Record<BulkWizardStep, StepCopy> = {
  url: BULK_FLOW_NINE_COPY[1],
  compose: BULK_FLOW_NINE_COPY[2],
  pick: BULK_FLOW_NINE_COPY[3],
  review: BULK_FLOW_NINE_COPY[4],
};

export function getBulkWizardStepCopy(
  wizard: BulkWizardStep,
  thankYouFlow: boolean,
): StepCopy {
  return (thankYouFlow ? THANKYOU_WIZARD_COPY : OBITUARY_WIZARD_COPY)[wizard];
}

export type AuthEntryCopyKey = "default" | "bulk" | "obituaryThenBulk";

export type AuthEntryCopy = StepCopy & {
  navTitle: string;
  docTitle: string;
  memberAria: string;
  guestAria: string;
};

export const AUTH_ENTRY_COPY: Record<AuthEntryCopyKey, AuthEntryCopy> = {
  default: {
    navTitle: "시작하기",
    title: "시작하기",
    subtitle: "회원·비회원 중 편한 방법을 선택해 주세요",
    docTitle: "PING · 시작하기",
    memberAria: "회원 로그인",
    guestAria: "비회원 로그인 · 본인인증 후 부고 만들기",
  },
  bulk: {
    navTitle: "본인 확인",
    title: "본인 확인",
    subtitle: "로그인 후 바로 발송 단계로 이어갈 수 있어요",
    docTitle: "PING · 발송 신청 계속",
    memberAria: "회원 로그인",
    guestAria: "비회원 로그인 후 발송 신청 계속",
  },
  obituaryThenBulk: {
    navTitle: "시작하기",
    title: "시작하기",
    subtitle: "로그인 후 부고 작성·발송 단계로 이어갑니다",
    docTitle: "PING · 부고 만들기",
    memberAria: "회원 로그인",
    guestAria: "비회원 로그인 · 본인인증 후 부고 만들기",
  },
};

export const AUTH_MEMBER_LOGIN_COPY: StepCopy = {
  title: "로그인",
  subtitle: "가입한 이메일과 비밀번호를 입력해 주세요",
  docTitle: "PING · 회원 로그인",
};

export const AUTH_KAKAO_MEMBER_LOGIN_COPY: StepCopy = {
  title: "카카오싱크",
  subtitle: "카카오 계정으로 간편 가입·로그인해 주세요",
  docTitle: "PING · 카카오싱크",
};

export const AUTH_SIGNUP_JOIN_TYPE_COPY = {
  navTitle: "가입 유형",
  title: "가입 유형",
  subtitle: "본인에게 맞는 유형을 선택해 주세요",
  docTitle: "PING · 가입 유형",
} as const;

/** `JoinType` 표시 라벨 — API·쿼리 값(`general`/`group`/`admin`)은 그대로 */
export const AUTH_SIGNUP_JOIN_TYPE_LABELS = {
  general: "일반회원",
  group: "장례지도사",
  admin: "장례식장",
} as const;

export const AUTH_SIGNUP_TERMS_COPY = {
  navTitle: "약관 동의",
  terms: {
    title: "약관 동의",
    subtitle: "필수 항목을 확인하고 동의해 주세요",
  },
  docTitle: "PING · 약관 동의",
} as const;

export const AUTH_SIGNUP_REGISTER_COPY = {
  navTitle: "회원가입",
  leadTitle: "1분이면 가입할 수 있어요",
  leadSubtitle: "입력 후 이메일 인증만 완료해 주세요",
  docTitle: "PING · 회원가입",
} as const;

export const AUTH_VERIFY_EMAIL_RESEND_HINT =
  "메일이 안 보이면 스팸·프로모션함을 확인해 주세요. 재발송은 잠시 후 버튼에 표시됩니다.";

export const AUTH_VERIFY_EMAIL_COPY = {
  navTitle: "이메일 인증",
  fromSignup: "메일로 받은 6자리 번호를 입력하면 가입이 완료돼요",
  default: "메일에 적힌 6자리 번호를 입력해 주세요",
  docTitle: "PING · 이메일 인증",
} as const;

export const AUTH_GUEST_VERIFY_COPY: StepCopy = {
  title: "본인인증",
  subtitle: "휴대폰 인증 후 비회원으로 발송을 이어갈 수 있어요",
  docTitle: "PING · 본인인증",
};
