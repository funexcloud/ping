import { PING_NOINDEX_METADATA } from "@/lib/ping-site-seo";
import type { ReactNode } from "react";
import "../admin-desktop.css";

export const metadata = PING_NOINDEX_METADATA;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-desktop-root">{children}</div>;
}
