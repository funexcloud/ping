import { BulkEntryClient } from "@/app/start/bulk-entry-client";
import { WebPageJsonLd } from "@/components/seo/site-json-ld";
import { buildPublicMetadata } from "@/lib/ping-site-seo";
import "./bulk-entry.css";

export const metadata = buildPublicMetadata({
  title: "PING - 부고 대량발송",
  description:
    "빠르고 정확한 부고 안내 문자·알림톡 대량발송. 엑셀 명단 업로드, 부고 URL 검증, 발송 채널 선택, 결제까지 3분.",
  path: "/start",
  keywords: ["부고 대량발송 시작", "엑셀 부고 문자", "알림톡 대량발송"],
});

export default function BulkEntryPage() {
  return (
    <>
      <WebPageJsonLd
        path="/start"
        title="PING 부고 대량발송"
        description="부고 URL·주소록·문자 작성·발송 검토 9단계 웹 플로우"
      />
      <BulkEntryClient />
    </>
  );
}
