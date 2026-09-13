import { PHONE_FLOW as INTRO_PHONE_FLOW } from "@/lib/intro/config";

export const PHONE_FLOW = INTRO_PHONE_FLOW;

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
