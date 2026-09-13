import type { BulkFlowStep, BulkWizardStep } from "@/lib/ping-bulk-flow-steps";

/** 화면 제목 + 토스형 보조 한 줄 */
export type StepCopy = {
  title: string;
  subtitle: string;
  docTitle?: string;
};

/** 8단계 진행바·단계 공통 (⑨ 부의금은 `POST_SEND_CONDOLENCE_COPY`) */
export const BULK_FLOW_STEP_COPY = {
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
    subtitle: "발송하신 분들의 명단을 정리할 수 있어요 (선택)",
    docTitle: "PING · 부의금 명단",
  },
} as Record<BulkFlowStep, StepCopy>;

/** @deprecated `BULK_FLOW_STEP_COPY` 사용 */
export const BULK_FLOW_NINE_COPY = BULK_FLOW_STEP_COPY;

export const POST_SEND_CONDOLENCE_COPY: StepCopy = {
  title: "부의금 명단",
  subtitle: "발송하신 분들의 명단을 정리할 수 있어요 (선택)",
  docTitle: "PING · 부의금 명단",
};

const THANKYOU_WIZARD_COPY: Record<BulkWizardStep, StepCopy> = {
  url: BULK_FLOW_STEP_COPY[1],
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
  review: BULK_FLOW_STEP_COPY[4],
};

const OBITUARY_WIZARD_COPY: Record<BulkWizardStep, StepCopy> = {
  url: BULK_FLOW_STEP_COPY[1],
  compose: BULK_FLOW_STEP_COPY[2],
  pick: BULK_FLOW_STEP_COPY[3],
  review: BULK_FLOW_STEP_COPY[4],
};

export function getBulkWizardStepCopy(
  wizard: BulkWizardStep,
  thankYouFlow: boolean,
): StepCopy {
  return (thankYouFlow ? THANKYOU_WIZARD_COPY : OBITUARY_WIZARD_COPY)[wizard];
}

/** `/start` 첫 화면 — 상담을 마친 맏상주가 오고 있는 가족에게 동시에 전하는 자리 */
export const START_INTENT_COPY = {
  navTitle: "시작하기",
  title: "중요한 소식을 한 번에 전하세요",
  subtitle: "부고를 준비하고, 주소록에서 연락처를 가져와 보낼 사람을 고릅니다.",
  writeTitle: "부고부터 작성하기",
  writeSub: "부고장을 만든 뒤 연락처를 불러와 바로 전해요",
  bulkTitle: "연락처 가져와서 보내기",
  bulkSub: "있는 부고 주소에 주소록 연락처를 붙여 한 번에 발송해요",
  docTitle: "PING · 시작하기",
} as const;

export type AuthEntryCopyKey = "default" | "bulk" | "obituaryThenBulk";

export type AuthEntryCopy = StepCopy & {
  navTitle: string;
  docTitle: string;
  memberAria: string;
  guestAria: string;
};

export const AUTH_ENTRY_COPY: Record<AuthEntryCopyKey, AuthEntryCopy> = {
  default: {
    navTitle: "로그인",
    title: "PING에 로그인",
    subtitle: "Google 계정으로 이어서 부고를 전할 수 있어요",
    docTitle: "PING · 로그인",
    memberAria: "회원 로그인",
    guestAria: "비회원 로그인 · 본인인증 후 부고 만들기",
  },
  bulk: {
    navTitle: "로그인",
    title: "PING에 로그인",
    subtitle: "로그인하면 선택한 연락처로 바로 이어갈 수 있어요",
    docTitle: "PING · 로그인",
    memberAria: "회원 로그인",
    guestAria: "비회원 로그인 후 발송 신청 계속",
  },
  obituaryThenBulk: {
    navTitle: "로그인",
    title: "PING에 로그인",
    subtitle: "로그인 후 부고 작성·발송을 이어갑니다",
    docTitle: "PING · 로그인",
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
  navTitle: "약관 동의 · 가입 유형",
  terms: {
    title: "약관 동의",
    subtitle: "필수 항목을 확인하고 동의해 주세요",
  },
  docTitle: "PING · 약관 동의 · 가입 유형",
} as const;

export const AUTH_CONDOLENCE_SIGNUP_TERMS_COPY = {
  navTitle: "약관 동의",
  brandLabel: "PING 디지털 방명록",
  terms: {
    title: "시작하기 전에 약관에 동의해 주세요",
    subtitle:
      "오신 분들을 빠짐없이 기록하고, 소중한 정보를 안전하게 보관합니다.",
  },
  agreeAll: "약관 전체에 동의합니다",
  ctaDisabled: "필수 항목에 동의해 주세요",
  ctaEnabled: "동의하고 시작하기",
  sheetAgree: "이 약관에 동의",
  items: {
    service: "이용약관",
    privacy: "개인정보 수집·이용",
    overseas: "개인정보 국외 이전",
    overseasHint: "일본(데이터 저장)·미국(이메일 인증)에 저장됩니다",
  },
  docTitle: "PING · 디지털 방명록 · 약관 동의",
} as const;

export const AUTH_CONDOLENCE_SIGNUP_REGISTER_COPY = {
  title: "회원가입",
  subtitle: "입력 후 이메일 인증만 완료해 주세요",
  submit: "가입 신청",
  loginHint: "이미 계정이 있으신가요?",
  docTitle: "PING · 디지털 방명록 · 회원가입",
} as const;

export const AUTH_CONDOLENCE_VERIFY_EMAIL_COPY = {
  title: "이메일 인증",
  fromSignup: "메일로 받은 6자리 번호를 입력하면 가입이 완료돼요",
  submit: "인증 완료",
  resend: "인증 메일 다시 보내기",
  docTitle: "PING · 디지털 방명록 · 이메일 인증",
} as const;

export const AUTH_CONDOLENCE_GUEST_VERIFY_COPY = {
  title: "본인인증",
  subtitle: "휴대폰 인증 후 방명록을 이용할 수 있어요",
  sendCode: "인증번호 받기",
  docTitle: "PING · 디지털 방명록 · 본인인증",
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

export const AUTH_MEMBER_RECOVER_COPY = {
  id: {
    navTitle: "아이디 찾기",
    title: "아이디 찾기",
    subtitle: "가입 때 등록한 휴대폰으로 확인합니다",
    docTitle: "PING · 아이디 찾기",
  },
  password: {
    navTitle: "비밀번호 찾기",
    title: "비밀번호 찾기",
    subtitle: "가입한 이메일로 인증 코드를 보냅니다",
    docTitle: "PING · 비밀번호 찾기",
  },
} as const;

export const AUTH_GUEST_VERIFY_COPY: StepCopy = {
  title: "본인인증",
  subtitle: "휴대폰 인증 후 비회원으로 발송을 이어갈 수 있어요",
  docTitle: "PING · 본인인증",
};

/** 전역·방명록 404 — PING의 '신호가 닿는다'는 언어로 통일 */
export const PING_NOT_FOUND_COPY = {
  docTitle: "PING · 페이지를 찾을 수 없음",
  kicker: "SIGNAL NOT FOUND",
  title: "찾으신 곳까지 신호가 닿지 않아요",
  subtitle: "주소가 바뀌었거나 페이지가 사라졌을 수 있어요. PING 홈에서 다시 이어가 주세요.",
  home: "PING 홈으로",
  back: "이전 화면",
} as const;

export const CONDOLENCE_NOT_FOUND_COPY = {
  docTitle: "PING · 기록을 찾을 수 없음",
  kicker: "RECORD NOT FOUND",
  title: "이 방명록은 찾을 수 없어요",
  subtitle: "공유받은 주소를 다시 확인해 주세요. 종료되었거나 삭제된 방명록일 수 있어요.",
  home: "방명록 홈으로",
} as const;

export const PING_ERROR_COPY = {
  kicker: "SIGNAL INTERRUPTED",
  title: "연결이 잠시 끊겼어요",
  subtitle: "일시적인 문제일 수 있어요. 다시 연결하면 보고 있던 화면부터 이어갈 수 있어요.",
  retry: "다시 연결",
  home: "PING 홈으로",
} as const;

export const PING_GLOBAL_ERROR_COPY = {
  kicker: "SYSTEM SIGNAL LOST",
  title: "PING을 다시 깨우고 있어요",
  subtitle: "서비스 연결에 예상하지 못한 문제가 생겼어요. 다시 시도하면 안전하게 첫 화면부터 연결합니다.",
  retry: "PING 다시 시작",
  home: "홈으로 이동",
} as const;

export const CONDOLENCE_ERROR_COPY = {
  kicker: "RECORD SIGNAL LOST",
  title: "방명록 연결이 잠시 끊겼어요",
  subtitle: "입력된 기록을 다시 불러오고 있어요. 잠시 후 한 번 더 연결해 주세요.",
  retry: "방명록 다시 연결",
  home: "방명록 홈으로",
} as const;
