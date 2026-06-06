import { PING_NOINDEX_METADATA } from "@/lib/ping-site-seo";
import type { ReactNode } from "react";

export const metadata = PING_NOINDEX_METADATA;

export default function MemorialLayout({ children }: { children: ReactNode }) {
  return children;
}
