import { PING_SITE_URL, PING_SITEMAP_ENTRIES } from "@/lib/ping-site-seo";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PING_SITEMAP_ENTRIES.map((entry) => ({
    url: entry.path === "/" ? PING_SITE_URL : `${PING_SITE_URL}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
