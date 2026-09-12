import Script from "next/script";

/** 기존 `assets/js/marketing-analytics.js` 계약. 계정/Property는 생성하지 않는다. */
export function PingAnalyticsScripts() {
  const ga4 = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "";
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
  const cfg = JSON.stringify({
    ga4MeasurementId: ga4,
    metaPixelId: pixel,
  });

  return (
    <>
      <Script id="ping-analytics-cfg" strategy="beforeInteractive">
        {`window.__PING_ANALYTICS__=${cfg};`}
      </Script>
      <Script src="/assets/js/marketing-analytics.js" strategy="afterInteractive" />
    </>
  );
}
