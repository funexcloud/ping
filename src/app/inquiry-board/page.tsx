import { InquiryBoardClient } from "@/app/inquiry-board/inquiry-board-client";
import { WebPageJsonLd } from "@/components/seo/site-json-ld";
import { buildPublicMetadata } from "@/lib/ping-site-seo";

export const metadata = buildPublicMetadata({
  title: "1:1 문의 - PING",
  description: "PING 1:1 문의 — 이용·결제·기술 문의를 남기고 접수 내역을 확인합니다.",
  path: "/inquiry-board",
});

export default function InquiryBoardPage() {
  return (
    <>
      <WebPageJsonLd path="/inquiry-board" title="PING 1:1 문의" description="고객 1:1 문의 게시판" />
      <InquiryBoardClient />
    </>
  );
}
