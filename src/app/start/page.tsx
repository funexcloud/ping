import { BulkEntryClient } from "@/app/start/bulk-entry-client";
import { WebPageJsonLd } from "@/components/seo/site-json-ld";
import { buildPublicMetadata } from "@/lib/ping-site-seo";
import "./bulk-entry.css";

export const metadata = buildPublicMetadata({
  title: "PING - 시작하기",
  description: "부고를 준비하고 연락처를 가져와 한 번에 전달하세요.",
  path: "/start",
  keywords: ["부고 대량발송 시작", "부고 작성", "엑셀 부고 문자", "알림톡 대량발송"],
});

export default function BulkEntryPage() {
  return (
    <>
      <WebPageJsonLd
        path="/start"
        title="PING 시작하기"
        description="부고 준비부터 연락처 가져오기까지 이어서 진행하는 시작 화면"
      />
      <BulkEntryClient />
    </>
  );
}
