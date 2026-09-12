import { PRODUCTS_PING_CONSUMER } from "@/content/seo/products-ping-content";
import type { ProductPingLandingContent } from "@/content/seo/products-ping-types";
import { Building2, FileSpreadsheet, Handshake, Users } from "lucide-react";

/** B2B — 장례지도사·장례식장 */
export const PRODUCTS_PING_BUSINESS: ProductPingLandingContent = {
  ...PRODUCTS_PING_CONSUMER,
  audience: "business",
  hero: {
    eyebrow: "장례지도사·장례식장을 위한 부고 발송",
    title: "현장에서 붙여넣고, 웹에서 대량 발송",
    titleAccent: "장례 1건당 약 2분",
    lead: "유가족에게 부고를 전달해 직접 보내게 하던 방식 대신, 기존 부고 URL만 넣으면 보안 처리 후 웹에서 대량 발송합니다.",
    badge: "현장 2분 발송",
  },
  oldWay: {
    ...PRODUCTS_PING_CONSUMER.oldWay,
    title: "현장에서 반복되던 발송 방식",
    description:
      "부고를 유가족에게 전달해 휴대폰으로 보내게 하거나, 지도사가 현장에서 대신 발송하는 방식이 일반적이었습니다.",
    pains: [
      "장례마다 같은 발송 업무가 반복됩니다",
      "유가족 휴대폰 발송으로 누락·오타가 생깁니다",
      "현장 멀티태스킹 중 발송이 밀립니다",
      "개인 번호 노출·스팸 차단 리스크",
    ],
  },
  theShift: {
    ...PRODUCTS_PING_CONSUMER.theShift,
    title: "붙여넣기 한 번으로 현장 발송이 바뀝니다",
    description: "엑셀·명단·제휴 링크와 함께, 웹 대량발송으로 현장 시간을 줄입니다.",
    beforeItems: [
      "유가족 전달 후 직접 발송",
      "지도사 현장 대행·10명씩 반복",
      "장례 1건당 수 시간",
    ],
    afterItems: [
      "부고 URL · 엑셀 명단",
      "제휴 링크로 현장 진입",
      "웹 대량발송 · 약 2분",
    ],
  },
  trust: {
    ...PRODUCTS_PING_CONSUMER.trust,
    items: [
      ...PRODUCTS_PING_CONSUMER.trust.items,
      {
        title: "업체 브랜드 발송",
        desc: "제휴·화이트라벨로 업체 명의 발송 체계를 구축할 수 있습니다.",
        Icon: Building2,
      },
    ],
  },
  vertical: {
    ...PRODUCTS_PING_CONSUMER.vertical,
    steps: [
      {
        title: "부고 대량 발송",
        desc: "명단·엑셀 업로드 후 웹에서 발송. 현장 1건 약 2분.",
        href: "/start?partner=1",
      },
      {
        title: "부의금 정리",
        desc: "유가족과 함께 방명록에서 봉투를 정리합니다.",
        href: "/condolence",
      },
      {
        title: "답례·후속 문자",
        desc: "답례 문자를 같은 명단 흐름으로 처리합니다.",
        href: "/start?thankyou=1",
      },
    ],
  },
  pricing: {
    ...PRODUCTS_PING_CONSUMER.pricing,
    planDesc: "기본 이용료 0원. 제휴·볼륨 할인은 문의해 주세요.",
    note: "채널별 건당 요금과 제휴 조건은 요금 안내·제휴 문의를 확인하세요.",
  },
  howItWorks: {
    ...PRODUCTS_PING_CONSUMER.howItWorks,
    steps: [
      {
        title: "붙여넣기",
        desc: "부고 URL 또는 제휴 링크로 진입해 부고·명단을 준비합니다.",
      },
      {
        title: "확인",
        desc: "발송 채널·수신 명단·신청자 정보를 확인합니다.",
      },
      {
        title: "발송",
        desc: "결제 후 웹 대량발송. 현장 1건 약 2분 수준으로 처리합니다.",
      },
    ],
  },
  faq: {
    ...PRODUCTS_PING_CONSUMER.faq,
    items: [
      {
        question: "장례지도사·장례식장도 같은 방식으로 쓰나요?",
        answer:
          "네. 유가족이 직접 쓰는 것과 동일하게 부고 URL 붙여넣기 → 보안 처리 → 웹 대량발송입니다. 제휴 링크·엑셀 명단으로 현장에서 빠르게 진행할 수 있습니다.",
      },
      ...PRODUCTS_PING_CONSUMER.faq.items.slice(1),
      {
        question: "제휴·도입은 어떻게 하나요?",
        answer:
          "제휴 문의 페이지에서 상담을 신청하거나, 운영 콘솔 도입하기를 통해 업체 브랜드 발송 체계를 검토할 수 있습니다.",
      },
    ],
  },
  start: {
    ...PRODUCTS_PING_CONSUMER.start,
    title: "제휴 링크로 현장 발송을 시작하세요",
    lead: "도입·제휴 문의도 함께 안내해 드립니다.",
  },
};

export const PRODUCTS_PING_ENTERPRISE = {
  anchorId: "enterprise",
  sectionLabel: "엔터프라이즈",
  title: "화이트라벨·엔터프라이즈",
  description: "귀사 브랜드의 대량발송 인프라가 필요하시면 제휴 문의를 이용해 주세요.",
  bullets: [
    { title: "화이트라벨 SaaS", desc: "업체 브랜드 UI·발송 도메인 구성", Icon: Handshake },
    { title: "명단·엑셀 연동", desc: "현장 운영 방식에 맞춘 명단 입력", Icon: FileSpreadsheet },
    { title: "다지점·다인 운영", desc: "장례식장·지도사 조직 단위 운영", Icon: Users },
  ],
} as const;

export function getProductPingContent(audience: ProductPingLandingContent["audience"]): ProductPingLandingContent {
  return audience === "business" ? PRODUCTS_PING_BUSINESS : PRODUCTS_PING_CONSUMER;
}
