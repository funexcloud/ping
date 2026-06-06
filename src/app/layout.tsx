import { PingGlobalLayout } from "@/components/ping-global-layout";
import { SiteJsonLd, SiteNavigationJsonLd } from "@/components/seo/site-json-ld";
import {
  PING_DEFAULT_DESCRIPTION,
  PING_DEFAULT_KEYWORDS,
  PING_ORG,
  PING_SITE_URL,
} from "@/lib/ping-site-seo";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

/** 하위 페이지가 `metadata.title` 을 없으면 탭 제목이 비어 보이므로 기본값을 둔다. */
export const metadata: Metadata = {
  metadataBase: new URL(PING_SITE_URL),
  title: {
    default: "PING - 부고 대량발송",
    template: "%s",
  },
  description: PING_DEFAULT_DESCRIPTION,
  keywords: [...PING_DEFAULT_KEYWORDS],
  applicationName: PING_ORG.brand,
  authors: [{ name: PING_ORG.legalName }],
  creator: PING_ORG.legalName,
  formatDetection: { email: false, telephone: false },
  alternates: { canonical: PING_SITE_URL },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ko" className="ping-ui" suppressHydrationWarning>
      <head>
        <link rel="llms-txt" href="/llms.txt" />
        <link
          href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <SiteJsonLd />
        <SiteNavigationJsonLd />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <PingGlobalLayout>{children}</PingGlobalLayout>
      </body>
    </html>
  );
}
