import { PING_SITE_URL } from "@/lib/ping-site-seo";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/checkout",
          "/payment-success",
          "/send/",
          "/login",
          "/member-login",
          "/obituary/",
          "/mourner-info",
          "/memorial/",
          "/mypage/",
          "/obituary-create",
          "/obituary-form",
          "/obituary-signup-",
          "/obituary-verify-email",
          "/obituary-guest-verify",
          "/setup-finish",
          "/kakao-pay-code-send",
          "/ping-cx-flow",
          "/stitch-wave",
        ],
      },
    ],
    sitemap: `${PING_SITE_URL}/sitemap.xml`,
    host: PING_SITE_URL,
  };
}
