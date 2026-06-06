import { PING_PRODUCT_MARKETING_PATH } from "@/lib/ping-site-seo";
import { permanentRedirect } from "next/navigation";

/** 레거시 `/overview` → 마케팅 캐논 `/products/ping` */
export default function OverviewRedirectPage() {
  permanentRedirect(PING_PRODUCT_MARKETING_PATH);
}
