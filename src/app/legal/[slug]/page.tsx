import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { JsonLd } from "@/components/seo/json-ld";
import { LEGAL_DOCUMENTS, LEGAL_SLUGS, type LegalSlug } from "@/content/legal";
import { buildPublicMetadata, PING_SITE_URL } from "@/lib/ping-site-seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = LEGAL_DOCUMENTS[slug as LegalSlug];
  if (!doc) return { title: "PING" };
  return buildPublicMetadata({
    title: `${doc.title} - PING`,
    description: `PING(핑) ${doc.title} — 부고 대량발송 서비스 정책 문서`,
    path: `/legal/${slug}`,
    ogType: "article",
  });
}

export default async function LegalSlugPage({ params }: Props) {
  const { slug } = await params;
  const doc = LEGAL_DOCUMENTS[slug as LegalSlug];
  if (!doc) notFound();

  const url = `${PING_SITE_URL}/legal/${slug}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: doc.title,
          url,
          inLanguage: "ko-KR",
          publisher: {
            "@type": "Organization",
            name: "PING",
            url: PING_SITE_URL,
          },
        }}
      />
      <Suspense fallback={<div className="p-6 text-sm text-ping-caption">불러오는 중…</div>}>
        <LegalDocumentPage title={doc.title} articleHtml={doc.articleHtml} />
      </Suspense>
    </>
  );
}
