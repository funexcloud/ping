import type { MetadataRoute } from "next";
import {
  PING_APP_ICON_SRC,
  PING_BRAND_NAME,
  PING_BRAND_PRIMARY,
  PING_LOGO_CANONICAL_SRC,
} from "@/lib/ping-brand";
import { PING_MAIN_APP_PATH } from "@/lib/ping-main-path";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PING_BRAND_NAME} — 부고 대량발송`,
    short_name: PING_BRAND_NAME,
    description: "부고 URL 붙여넣기부터 웹 대량 발송까지",
    start_url: PING_MAIN_APP_PATH,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f4f6",
    theme_color: PING_BRAND_PRIMARY,
    lang: "ko",
    icons: [
      {
        src: PING_LOGO_CANONICAL_SRC,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PING_APP_ICON_SRC,
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
