import { PING_OVERVIEW_FAQ } from "@/lib/ping-site-seo";
import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  ChartLine,
  Link2,
  ListChecks,
  MessageCircle,
  Shield,
} from "lucide-react";

export { PING_OVERVIEW_FAQ };

export type OverviewFeature = {
  title: string;
  desc: string;
  Icon: LucideIcon;
};

export const OVERVIEW_HERO = {
  eyebrow: "부고 커뮤니케이션 플랫폼",
  title: "부고부터 발송, 확인, 추모까지 한 번에 연결하세요.",
  lead:
    "주소록 불러오기, 발송 채널 선택, 신청자 확인, 결제까지 흐름을 단순하게 줄였습니다. 필요한 순간에 빠르게 전달하고, 운영은 더 정확하게 관리할 수 있습니다.",
  highlights: ["비회원 결제 지원", "건당 110원 요금", "모바일 최적화"],
} as const;

export const OVERVIEW_FEATURES: OverviewFeature[] = [
  {
    title: "링크 우선 검증",
    desc: "발송 전 링크 형식을 먼저 체크해, 잘못된 주소로 인한 재작업을 줄입니다.",
    Icon: Link2,
  },
  {
    title: "다양한 주소록 입력",
    desc: "Google 연락처와 CSV/엑셀 파일 업로드를 지원해, 기존 운영 방식을 그대로 가져올 수 있습니다.",
    Icon: BookMarked,
  },
  {
    title: "유효 번호 자동 반영",
    desc: "중복/형식 오류를 걸러낸 뒤 유효 수신 건수를 기준으로 금액을 계산합니다.",
    Icon: ListChecks,
  },
  {
    title: "발송 채널 선택",
    desc: "문자 또는 카카오 알림톡 중 상황에 맞게 선택해 전달 정확도를 높입니다.",
    Icon: MessageCircle,
  },
  {
    title: "신청자 확인 후 진행",
    desc: "결제 직전 신청자 정보를 확인해 오발송과 책임 소재를 명확하게 관리합니다.",
    Icon: Shield,
  },
  {
    title: "상태 추적 용이",
    desc: "접수, 결제, 처리 상태를 흐름 중심으로 볼 수 있어 운영 모니터링이 간단합니다.",
    Icon: ChartLine,
  },
];

export const OVERVIEW_STEPS = [
  {
    title: "링크와 주소록 준비",
    desc: "부고 링크를 입력하고 연락처를 불러옵니다. 주소록 검증을 거쳐 정확한 수신 대상을 확보합니다.",
  },
  {
    title: "채널과 신청자 정보 확정",
    desc: "발송 채널을 선택하고 신청자 정보를 입력해 결제 전 상태를 최종 점검합니다.",
  },
  {
    title: "결제 후 처리 진행",
    desc: "결제 완료 후 주문 상태를 추적하고, 필요 시 고객센터와 정책 페이지를 통해 후속 처리합니다.",
  },
] as const;

export const OVERVIEW_PRICING = {
  planName: "표준 발송 요금",
  planDesc: "기본 이용료 없이, 발송 건수 기준으로 계산합니다.",
  pricePerUnit: "110원",
  baseFee: "0원",
  note: "정책 및 결제 안내 기준 적용",
} as const;

export const OVERVIEW_PREVIEW_ITEMS = [
  { label: "링크 확인", value: "부고 URL 형식 검증" },
  { label: "연락처 반영", value: "수신 건수 기준 요금 산정" },
  { label: "발송 채널", value: "문자 / 카카오 알림톡" },
  { label: "예상 결제", value: "건당 110원 × 유효 건수" },
  { label: "현재 상태", value: "접수 · 결제 · 발송 추적" },
] as const;
