import { CustomerCenterClient } from "@/app/customer-center/customer-center-client";
import { WebPageJsonLd } from "@/components/seo/site-json-ld";
import { buildPublicMetadata } from "@/lib/ping-site-seo";

export const metadata = buildPublicMetadata({
  title: "고객센터 - PING",
  description: "PING 부고 대량발송 — 결제·환불·이용 안내, 1:1 문의, 기술 지원",
  path: "/customer-center",
  keywords: ["PING 고객센터", "부고 발송 문의", "환불 안내"],
});

export default function CustomerCenterPage() {
  return (
    <>
      <WebPageJsonLd path="/customer-center" title="PING 고객센터" description="결제·환불·이용 문의" />
      <CustomerCenterClient />
    </>
  );
}
