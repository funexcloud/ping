import type { LucideIcon } from "lucide-react";
import { Calculator, Layers, Receipt, ShieldCheck } from "lucide-react";

/** `#pricing` 아래 — 요금 걱정 Marquee + 4열 안내 */
export const LANDING_PRICING_CLARITY = {
  title: "요금, 복잡하게 두지 않습니다",
  lead: "월 정액, 숨은비용없이 발송건수만 정하면 됩니다.",
  marquee: [
    "기본료가 정말 0원인가요?",
    "알림톡이 더 싸나요?",
    "300명 보내면 얼마예요?",
    "SMS랑 LMS 차이는?",
    "비회원도 결제할 수 있나요?",
    "환불은 어떻게 되나요?",
    "스팸으로 막히지 않나요?",
    "VAT는 별도인가요?",
    "최소 결제 금액이 있나요?",
    "같은 번호로 대량 발송해도 되나요?",
    "카카오 알림톡 실패하면?",
    "건수만큼만 내는 게 맞나요?",
  ],
  features: [
    {
      title: "기본료 0원",
      description:
        "월정액·가입비 없이, 실제로 발송한 건수와 선택한 채널만큼만 과금합니다.",
      Icon: Receipt,
    },
    {
      title: "투명요금",
      description:
        "건별 요금으로 발송량 만큼만 과금됩니다.",
      Icon: Layers,
    },
    {
      title: "예상 비용 미리 확인",
      description:
        "발송전 연락처 건수를 확정하면 미리 요금은 확인할수 있습니다.",
      Icon: Calculator,
    },
    {
      title: "환불 기준 명확",
      description:
        "결제·환불 정책을 페이지에서 확인할 수 있습니다. 불필요한 걱정 없이 시작하세요.",
      Icon: ShieldCheck,
    },
  ] satisfies ReadonlyArray<{
    title: string;
    description: string;
    Icon: LucideIcon;
  }>,
} as const;
