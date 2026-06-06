import type { Metadata } from "next";

import { KakaoPayCodeSendClient } from "./kakao-pay-code-send-client";

export const metadata: Metadata = {
  title: "카카오페이 코드송금",
  description:
    "카카오페이 코드송금 안내 및 코드·요청 문구 복사 도구. 다른 신청·결제 단계와 연결되지 않습니다.",
  robots: { index: false, follow: false },
};

export default function KakaoPayCodeSendPage() {
  return <KakaoPayCodeSendClient />;
}
