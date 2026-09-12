import { PingAnalyticsScripts } from "@/components/analytics/ping-analytics-scripts";
import { PingGlobalLayout } from "@/components/ping-global-layout";
import { PwaServiceWorkerRegister } from "@/components/pwa/PwaServiceWorkerRegister";
import { SiteJsonLd, SiteNavigationJsonLd } from "@/components/seo/site-json-ld";
import { PING_BRAND_NAME, PING_BRAND_PRIMARY } from "@/lib/ping-brand";
import {
  PING_DEFAULT_DESCRIPTION,
  PING_DEFAULT_KEYWORDS,
  PING_ORG,
  PING_SITE_URL,
} from "@/lib/ping-site-seo";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";

/** 하위 페이지가 `metadata.title` 을 없으면 탭 제목이 비어 보이므로 기본값을 둔다. */
export const metadata: Metadata = {
  metadataBase: new URL(PING_SITE_URL),
  title: {
    default: `${PING_BRAND_NAME} - 부고 전달`,
    template: "%s",
  },
  description: PING_DEFAULT_DESCRIPTION,
  keywords: [...PING_DEFAULT_KEYWORDS],
  applicationName: PING_BRAND_NAME,
  authors: [{ name: PING_ORG.legalName }],
  creator: PING_ORG.legalName,
  formatDetection: { email: false, telephone: false },
  alternates: { canonical: PING_SITE_URL },
  appleWebApp: {
    capable: true,
    title: PING_BRAND_NAME,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: PING_BRAND_PRIMARY,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Nanum+Brush+Script&family=Noto+Serif+KR:wght@600;700&family=Pretendard:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <SiteJsonLd />
        <SiteNavigationJsonLd />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <PingAnalyticsScripts />
        <PwaServiceWorkerRegister />
        <Suspense fallback={null}>
          <PingGlobalLayout>{children}</PingGlobalLayout>
        </Suspense>
      </body>
    </html>
  );
}
