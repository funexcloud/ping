export const PHONE_FLOW = [
  {
    key: "paste",
    label: "붙여넣기",
    title: "부고 URL을 붙여넣으세요",
    body: "받은 부고 링크만 붙여넣으면 문자 초안까지 이어집니다.",
  },
  {
    key: "parse",
    label: "정보 인식",
    title: "고인·빈소·발인을 자동으로 인식",
    body: "고인·빈소·발인 자동 추출",
  },
  {
    key: "safelink",
    label: "보안 변환",
    title: "수신자별 Safe Link 생성",
    body: "수신자별 Safe Link 토큰 URL",
  },
  {
    key: "dispatch",
    label: "대량 발송",
    title: "한 번에 보내도 한 사람씩 도착",
    body: "Solapi 발송 · 멱등성 키",
  },
  {
    key: "result",
    label: "완료",
    title: "312명, 누락 없이 완료",
    body: "성공/실패 집계",
  },
] as const;

export type PhoneFlowStepKey = (typeof PHONE_FLOW)[number]["key"];

export const DEMO_OBITUARY = `[부고]
父 김영수(金永洙)님 별세
· 빈소 : 울산하늘공원 3호실
· 발인 : 6월 20일 오전 7시`;

export const DEMO_FUNERAL_URL =
  "https://www.ulsan.go.kr/funeral/obituary/kim-youngsoo";

export const MAGIC_SECTIONS = {
  experience: {
    id: "experience",
    label: "Experience",
  },
} as const;
