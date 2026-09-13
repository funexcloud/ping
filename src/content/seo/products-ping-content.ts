import type { ProductPingLandingContent } from "@/content/seo/products-ping-types";
import {
  BadgeCheck,
  Fingerprint,
  Link2,
  PhoneOff,
  Shield,
} from "lucide-react";

export const PRODUCTS_PING_CONSUMER: ProductPingLandingContent = {
  audience: "consumer",
  hero: {
    eyebrow: "한 번에 전하는 중요한 소식",
    title: "부고를 준비하고",
    titleAccent: "필요한 사람에게 한 번에 전하세요",
    lead: "부고 링크를 넣거나 내용을 작성한 뒤, 연락처를 가져와 보낼 사람을 고르고 결과를 확인합니다.",
    badge: "부고 준비부터",
  },
  oldWay: {
    anchorId: "old-way",
    sectionLabel: "옛 방식",
    title: "지금까지 부고는 이렇게 보냈습니다",
    description: "부고가 유가족에게 전달되면, 휴대폰에서 10명씩 직접 발송하는 방식",
    pains: [
      "연락처마다 직접 보내다 누락·오타가 생깁니다",
      "개인 발신번호가 그대로 노출됩니다",
      "대량 발송 시 스팸으로 차단되기 쉽습니다",
      "한밤중에도 발송 노동이 이어집니다",
    ],
  },
  theShift: {
    anchorId: "the-shift",
    sectionLabel: "전환",
    title: "부고를 준비한 뒤 한 번에 전합니다",
    description: "부고 내용을 확인하고, 연락처를 가져와 필요한 사람에게만 전달합니다.",
    beforeTitle: "기존 방식",
    beforeItems: [
      "유가족 휴대폰에서 10명씩 수차례 발송",
      "수백 명이면 몇 시간",
      "발신번호·스팸 리스크",
    ],
    afterTitle: "PING",
    afterItems: [
      "부고 준비 · 미리보기",
      "연락처 가져오기 · 대상 선택",
      "한 번에 전달 · 결과 확인",
    ],
    demoHint: "부고를 준비하면 미리보기에서 이렇게 정리됩니다",
    timeBadge: "한 번에",
  },
  trust: {
    anchorId: "trust",
    sectionLabel: "안심",
    title: "웹에서 전하는 방식이 더 단순한 이유",
    description: "선택한 대상만 확인하고, 보낸 뒤 결과를 볼 수 있습니다.",
    items: [
      {
        title: "선택한 사람에게만",
        desc: "주소록에서 고른 대상에게만 보냅니다.",
        Icon: Link2,
      },
      {
        title: "발송 전 대상 확인",
        desc: "보내기 전에 선택한 인원을 다시 확인할 수 있습니다.",
        Icon: BadgeCheck,
      },
      {
        title: "결과 확인",
        desc: "발송이 끝나면 전달 결과를 화면에서 확인합니다.",
        Icon: Fingerprint,
      },
      {
        title: "안전한 결제",
        desc: "결제 금액과 발송 건수를 확인한 뒤 진행합니다.",
        Icon: Shield,
      },
      {
        title: "간단한 절차",
        desc: "부고 준비, 연락처 가져오기, 발송까지 이어집니다.",
        Icon: PhoneOff,
      },
    ],
  },
  vertical: {
    anchorId: "vertical",
    sectionLabel: "이어지는 흐름",
    title: "발송 후에도 한 흐름으로 이어집니다",
    description: "발송 뒤에는 방명록에서 부의금을 정리하고 답례 문자로 이어갈 수 있습니다.",
    steps: [
      {
        title: "부고 대량 발송",
        desc: "부고를 준비하고 확인할 사람을 고른 뒤 한 번에 전합니다.",
        href: "/start",
      },
      {
        title: "부의금 정리",
        desc: "방명록에 성함을 남기고, 같은 목록에서 봉투 금액을 맞춰 봅니다.",
        href: "/condolence",
      },
      {
        title: "답례 문자",
        desc: "감사 인사 문자를 같은 명단 흐름으로 이어갈 수 있습니다.",
        href: "/start?thankyou=1",
      },
    ],
  },
  pricing: {
    anchorId: "pricing",
    sectionLabel: "요금",
    title: "기본료 없이, 쓴 만큼만",
    description: "복잡한 요금제 없이 발송한 건수만큼만 계산합니다.",
    planName: "표준 발송 요금",
    planDesc: "기본 이용료 0원 · 발송 건수 × 110원",
    baseFee: "0원",
    unitPrice: "1건당 110원",
    note: "발송 건수에 따라 합산됩니다.",
  },
  howItWorks: {
    anchorId: "how-it-works",
    sectionLabel: "이용 방법",
    title: "이렇게 전합니다",
    description: "부고 준비, 연락처 가져오기, 대상 선택, 발송 준비, 결과 확인 순입니다.",
    steps: [
      {
        title: "부고 준비",
        desc: "부고 링크를 넣거나 내용을 작성하고 미리보기에서 확인합니다.",
      },
      {
        title: "연락처 가져오기",
        desc: "주소록에서 연락처를 불러옵니다. Google 로그인은 이 단계에서만 이어집니다.",
      },
      {
        title: "발송 대상 선택",
        desc: "전할 사람만 고릅니다.",
      },
      {
        title: "발송 준비",
        desc: "건수와 내용을 확인한 뒤 결제로 이어갑니다.",
      },
      {
        title: "발송 및 결과 확인",
        desc: "선택한 사람에게 전달하고 결과를 확인합니다.",
      },
    ],
  },
  faq: {
    anchorId: "faq",
    sectionLabel: "자주 묻는 질문",
    title: "자주 묻는 질문",
    description: "부고 발송 방식·보안·이용 흐름에 대해 자주 묻는 질문입니다.",
    items: [
      {
        question: "부고 문자를 여러 사람에게 어떻게 보내나요?",
        answer:
          "PING은 부고를 준비한 뒤 연락처를 가져와 보낼 사람을 고르고, 한 번에 전달합니다. 선택한 사람에게만 보내며, 발송 전 대상과 발송 후 결과를 확인할 수 있습니다.",
      },
      {
        question: "연락처는 어떻게 가져오나요?",
        answer:
          "Google 연락처를 불러오거나 기존처럼 엑셀·파일로 가져올 수 있습니다. 가져온 목록에서 보낼 사람만 선택합니다. 연락처 내용은 광고 분석에 보내지 않습니다.",
      },
      {
        question: "단체 부고 문자와 무엇이 다른가요?",
        answer:
          "한 번에 보내더라도 선택한 대상만 확인한 뒤 발송합니다. 발송 화면에서 인원과 결과를 볼 수 있습니다.",
      },
      {
        question: "로그인은 언제 하나요?",
        answer:
          "부고 보내기를 눌러 부고를 먼저 준비합니다. Google 로그인은 연락처 가져오기를 누를 때만 이어집니다.",
      },
      {
        question: "결제는 안전한가요?",
        answer:
          "결제 전에 발송 건수와 금액을 확인하고 진행합니다. 정책 페이지에서 결제·환불 기준을 볼 수 있습니다.",
      },
    ],
  },
  start: {
    anchorId: "start",
    sectionLabel: "시작",
    title: "지금 부고를 전하세요",
    lead: "부고를 준비하고 보낼 사람을 고른 뒤 한 번에 전달할 수 있습니다.",
  },
};

export const PRODUCTS_PING_HOWTO_JSONLD = PRODUCTS_PING_CONSUMER.howItWorks.steps.map((s) => ({
  name: s.title,
  text: s.desc,
}));

export const PRODUCTS_PING_FAQ_ALL = PRODUCTS_PING_CONSUMER.faq.items;
