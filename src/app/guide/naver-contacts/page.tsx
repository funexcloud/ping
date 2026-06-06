import { GuideNaverContactsClient } from "@/app/guide/naver-contacts/guide-naver-contacts-client";
import { WebPageJsonLd } from "@/components/seo/site-json-ld";
import { buildPublicMetadata, PING_SITE_URL } from "@/lib/ping-site-seo";

const GUIDE_OG = `${PING_SITE_URL}/assets/guide/step1-naver-install.png`;

export const metadata = buildPublicMetadata({
  title: "네이버 주소록으로 연락처 가져오기 — PING 가이드",
  description:
    "네이버 앱 주소록을 활용해 폰 연락처를 보내고 PING 대량 발송에 반영하는 방법을 단계별로 안내합니다.",
  path: "/guide/naver-contacts",
  keywords: ["네이버 주소록", "연락처 엑셀", "부고 발송 주소록"],
  ogType: "article",
  ogImage: GUIDE_OG,
});

export default function GuideNaverContactsPage() {
  return (
    <>
      <WebPageJsonLd
        path="/guide/naver-contacts"
        title="네이버 주소록 가이드"
        description="PING 부고 발송용 네이버 주소록 연동 방법"
      />
      <GuideNaverContactsClient />
    </>
  );
}
