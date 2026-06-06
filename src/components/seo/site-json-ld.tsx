import { JsonLd } from "@/components/seo/json-ld";
import {
  PING_ORG,
  PING_PRODUCT_MARKETING_PATH,
  PING_SITE_URL,
  PING_SITEMAP_ENTRIES,
} from "@/lib/ping-site-seo";

/** 전역 Organization + WebSite (모든 공개 페이지) */
export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${PING_SITE_URL}/#organization`,
    name: PING_ORG.name,
    legalName: PING_ORG.legalName,
    url: PING_SITE_URL,
    email: PING_ORG.email,
    logo: `${PING_SITE_URL}/ping_logo_svg.svg`,
    areaServed: { "@type": "Country", name: PING_ORG.country },
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: PING_ORG.brand,
    url: PING_SITE_URL,
    inLanguage: "ko-KR",
    publisher: { "@id": organization["@id"] },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${PING_SITE_URL}${PING_PRODUCT_MARKETING_PATH}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: PING_ORG.brand,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      priceCurrency: "KRW",
      description: "건당 과금 — 알림톡·SMS·LMS·MMS 요금은 /pricing 참고",
      url: `${PING_SITE_URL}/pricing`,
    },
    url: PING_SITE_URL,
    description:
      "부고 URL 검증, 주소록 업로드, 알림톡·SMS 대량 발송, 결제를 하나의 웹 흐름으로 제공하는 장례 커뮤니케이션 서비스",
  };

  return <JsonLd data={[organization, webSite, software]} />;
}

export function FaqPageJsonLd({ items }: { items: readonly { question: string; answer: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }}
    />
  );
}

export function WebPageJsonLd({
  path,
  title,
  description,
}: {
  path: string;
  title: string;
  description: string;
}) {
  const url = path === "/" ? PING_SITE_URL : `${PING_SITE_URL}${path}`;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        url,
        name: title,
        description,
        inLanguage: "ko-KR",
        isPartOf: { "@type": "WebSite", url: PING_SITE_URL, name: PING_ORG.brand },
      }}
    />
  );
}

export function HowToJsonLd({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: readonly { name: string; text: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        inLanguage: "ko-KR",
        step: steps.map((step, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: step.name,
          text: step.text,
        })),
      }}
    />
  );
}

/** GEO: 사이트맵 URL 목록을 ItemList로 노출 */
export function SiteNavigationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "PING 주요 페이지",
        itemListElement: PING_SITEMAP_ENTRIES.map((entry, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${PING_SITE_URL}${entry.path === "/" ? "" : entry.path}`,
          name: entry.path,
        })),
      }}
    />
  );
}
