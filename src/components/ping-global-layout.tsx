"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BulkFlowLogoBar } from "@/components/bulk/bulk-flow-logo-bar";
import { PingSiteLegalFooter } from "@/components/ping-site-legal-footer";

/** 전역 로고 헤더를 숨길 경로 — 홈(자체 랜딩)·관리자·풀스크린 연출 */
const HIDE_HEADER_EXACT = ["/", "/intro", "/stitch-wave", "/ping-cx-flow", "/flower", "/console"] as const;
/** 전역 푸터를 숨길 경로 — 관리자·풀스크린 연출 (홈에는 유지) */
const HIDE_FOOTER_EXACT = ["/intro", "/stitch-wave", "/ping-cx-flow"] as const;
const HIDE_PREFIXES = ["/admin"] as const;
const FULL_WIDTH_EXACT = ["/flower", "/console"] as const;

function matchesPrefix(pathname: string): boolean {
  return HIDE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function PingGlobalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const hideHeader =
    (HIDE_HEADER_EXACT as readonly string[]).includes(pathname) || matchesPrefix(pathname);
  const hideFooter =
    (HIDE_FOOTER_EXACT as readonly string[]).includes(pathname) || matchesPrefix(pathname);
  const fullWidth =
    (FULL_WIDTH_EXACT as readonly string[]).includes(pathname) || matchesPrefix(pathname);

  return (
    <div className="ping-global-root flex min-h-dvh w-full flex-col items-center bg-[var(--ping-bg)]">
      <div
        className={`ping-global-main flex min-h-0 w-full flex-1 flex-col ${
          fullWidth ? "max-w-none" : "max-w-[400px]"
        }`}
      >
        {!hideHeader ? <BulkFlowLogoBar /> : null}
        {children}
        {!hideFooter ? (
          <div className="ping-global-footer-slot w-full shrink-0">
            <PingSiteLegalFooter />
          </div>
        ) : null}
      </div>
    </div>
  );
}
