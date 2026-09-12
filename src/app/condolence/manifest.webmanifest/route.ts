import { NextResponse } from "next/server";
import { PING_BRAND_PRIMARY, PING_LOGO_MARK_SRC } from "@/lib/ping-brand";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    {
      name: "PING 디지털 방명록",
      short_name: "PING 방명록",
      description: "유가족을 위한 방명록과 부의금 정리",
      start_url: "/condolence/book",
      scope: "/condolence",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: PING_BRAND_PRIMARY,
      lang: "ko",
      icons: [{ src: PING_LOGO_MARK_SRC, sizes: "512x512", type: "image/png", purpose: "any" }],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
